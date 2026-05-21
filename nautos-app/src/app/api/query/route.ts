import { NextRequest } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://worker-api:8000";
const QUERY_TIMEOUT_MS = 120_000; // 2 minutes — RAG + Claude streaming worst case

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const userId = req.headers.get("x-user-id");
  if (!tenantId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await req.json();
  const { question, vesselId } = body;

  if (!question) {
    return new Response(JSON.stringify({ error: "Question is required" }), { status: 400 });
  }

  // Abort the upstream fetch if the worker hangs
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  let workerRes: Response;
  try {
    workerRes = await fetch(`${WORKER_URL}/api/query/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        tenant_id: tenantId,
        vessel_id: vesselId || null,
        user_id: userId,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      return new Response(
        JSON.stringify({ error: "Query timed out" }),
        { status: 504 }
      );
    }
    return new Response(
      JSON.stringify({ error: "Worker unreachable" }),
      { status: 502 }
    );
  }

  if (!workerRes.ok || !workerRes.body) {
    clearTimeout(timeout);
    return new Response(JSON.stringify({ error: "Query failed" }), { status: 502 });
  }

  // Clear the timeout once headers come back — streaming itself can take a while
  clearTimeout(timeout);

  return new Response(workerRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
