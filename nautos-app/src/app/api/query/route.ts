import { NextRequest } from "next/server";
import { requireTenant } from "@/lib/server/api-helpers";
import { streamQuery } from "@/lib/clients/worker";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatSessions, chatMessages } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

const QUERY_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * SSE query endpoint.
 *
 * Without sessionId: one-off query, no persistence.
 * With sessionId: persists user message, accumulates assistant response,
 *   saves it + sources when stream completes, bumps session.updated_at.
 *   Also auto-titles the session from the first question if still "New chat".
 */
export async function POST(req: NextRequest) {
  const ctx = requireTenant(req);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const { question, vesselId, documentId, sessionId } = body;

  if (!question) {
    return new Response(JSON.stringify({ error: "Question is required" }), { status: 400 });
  }

  // ─── If session provided: verify ownership, load history from DB, save user msg ───
  let chatHistory: { role: "user" | "assistant"; content: string }[] | undefined;
  let effectiveDocumentId: string | null = documentId || null;
  let effectiveVesselId: string | null = vesselId || null;

  if (sessionId) {
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.userId, ctx.userId),
          eq(chatSessions.tenantId, ctx.tenantId)
        )
      )
      .limit(1);

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
    }

    // Session-scoped doc/vessel takes precedence — chat preserves its scope
    if (session.documentId) effectiveDocumentId = session.documentId;
    if (session.vesselId) effectiveVesselId = session.vesselId;

    // Load history from DB (don't trust client — could be stale or tampered)
    const prior = await db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));

    chatHistory = prior.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Save user message immediately
    await db.insert(chatMessages).values({
      sessionId,
      role: "user",
      content: question,
    });

    // Auto-title from first question if still default
    if (session.title === "New chat") {
      const autoTitle = question.length > 60 ? question.slice(0, 57).trim() + "..." : question;
      await db
        .update(chatSessions)
        .set({ title: autoTitle, updatedAt: new Date() })
        .where(eq(chatSessions.id, sessionId));
    } else {
      await db
        .update(chatSessions)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessions.id, sessionId));
    }
  } else if (body.chatHistory) {
    // Stateless mode: client supplies its own ephemeral history
    chatHistory = body.chatHistory;
  }

  // ─── Forward to worker, abort if it hangs past timeout ────────────
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  let workerRes: Response;
  try {
    workerRes = await streamQuery({
      question,
      tenantId: ctx.tenantId,
      vesselId: effectiveVesselId,
      documentId: effectiveDocumentId,
      userId: ctx.userId,
      chatHistory,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      return new Response(JSON.stringify({ error: "Query timed out" }), { status: 504 });
    }
    return new Response(JSON.stringify({ error: "Worker unreachable" }), { status: 502 });
  }

  if (!workerRes.ok || !workerRes.body) {
    clearTimeout(timeout);
    return new Response(JSON.stringify({ error: "Query failed" }), { status: 502 });
  }

  clearTimeout(timeout);

  // ─── If sessionId, wrap stream to intercept events for persistence ─
  if (sessionId) {
    const wrapped = wrapStreamForPersistence(workerRes.body, sessionId);
    return new Response(wrapped, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Stateless: forward stream unchanged
  return new Response(workerRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Wrap an SSE stream so we can parse events as they fly past, accumulate
 * the assistant's text + sources, and persist the final message when the
 * stream closes. The stream itself is passed through to the client unchanged.
 */
function wrapStreamForPersistence(
  upstream: ReadableStream<Uint8Array>,
  sessionId: string
): ReadableStream<Uint8Array> {
  let accumulatedText = "";
  let finalSources: unknown[] = [];
  let sseBuffer = "";
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Pass through to client immediately
          controller.enqueue(value);

          // Also parse to capture for persistence
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "text" && event.content) {
                accumulatedText += event.content;
              } else if (event.type === "sources") {
                finalSources = event.content || [];
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }
      } finally {
        controller.close();
        // Persist after stream closes — fire and forget; client already has the response
        if (accumulatedText) {
          try {
            await db.insert(chatMessages).values({
              sessionId,
              role: "assistant",
              content: accumulatedText,
              sources: finalSources.length > 0 ? finalSources : null,
            });
            await db
              .update(chatSessions)
              .set({ updatedAt: new Date() })
              .where(eq(chatSessions.id, sessionId));
          } catch (err) {
            console.error("Failed to persist assistant message:", err);
          }
        }
      }
    },
  });
}
