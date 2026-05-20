import { NextRequest } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://worker-api:8000";

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

  const workerRes = await fetch(`${WORKER_URL}/api/query/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      tenant_id: tenantId,
      vessel_id: vesselId || null,
      user_id: userId,
    }),
  });

  if (!workerRes.ok || !workerRes.body) {
    return new Response(JSON.stringify({ error: "Query failed" }), { status: 502 });
  }

  return new Response(workerRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
