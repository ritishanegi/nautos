import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");

export default redis;

export async function dispatchCeleryTask(taskName: string, args: unknown[]) {
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
