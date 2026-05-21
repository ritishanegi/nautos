import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");

export default redis;

const WORKER_URL = process.env.WORKER_URL || "http://worker-api:8000";

/**
 * Dispatch a Celery task via the Python worker's HTTP API.
 * This avoids hand-rolling the Celery protocol — the worker dispatches natively.
 */
export async function dispatchCeleryTask(taskName: string, args: unknown[]) {
  if (taskName === "ingest_document" && args.length === 1) {
    // Use the dedicated ingestion endpoint
    const res = await fetch(`${WORKER_URL}/tasks/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: args[0] }),
    });

    if (!res.ok) {
      throw new Error(`Worker dispatch failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return data.task_id;
  }

  // Fallback: generic Celery dispatch via Redis (for other task types)
  const taskId = crypto.randomUUID();
  const message = {
    id: taskId,
    task: taskName,
    args,
    kwargs: {},
    retries: 0,
    eta: null,
  };

  await redis.lpush(
    "celery",
    JSON.stringify({
      body: Buffer.from(JSON.stringify(message)).toString("base64"),
      "content-encoding": "utf-8",
      "content-type": "application/json",
      headers: {
        lang: "py",
        task: taskName,
        id: taskId,
        root_id: taskId,
        parent_id: null,
        group: null,
      },
      properties: {
        correlation_id: taskId,
        reply_to: "",
        delivery_mode: 2,
        delivery_info: { exchange: "", routing_key: "celery" },
        priority: 0,
        body_encoding: "base64",
      },
    })
  );

  return taskId;
}
