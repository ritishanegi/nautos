import { NextRequest } from "next/server";
import { requireTenant } from "@/lib/server/api-helpers";
import { streamQuery } from "@/lib/clients/worker";
import { NextResponse } from "next/server";

const QUERY_TIMEOUT_MS = 120_000; // 2 minutes

export async function POST(req: NextRequest) {
  const ctx = requireTenant(req);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const { question, vesselId } = body;

  if (!question) {
    return new Response(JSON.stringify({ error: "Question is required" }), { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  let workerRes: Response;
  try {
    workerRes = await streamQuery({
      question,
      tenantId: ctx.tenantId,
      vesselId: vesselId || null,
      userId: ctx.userId,
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

  return new Response(workerRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
