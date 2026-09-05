import IORedis from "ioredis";
import { createPostgresBackend, setDefaultBackendFactory } from "bullmq";

const queueBackend = (process.env.QUEUE_BACKEND ?? "redis").trim().toLowerCase();

let connection: unknown;

if (queueBackend === "postgres") {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when QUEUE_BACKEND=postgres");
  }

  setDefaultBackendFactory(createPostgresBackend);
  connection = databaseUrl;
} else {
  const client = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: true,
    retryStrategy: (times) => Math.min(times * 500, 5_000),
  });

  client.on("error", (error) => {
    console.error("[redis]", error.message);
  });

  connection = client;
}

export const redis = connection as any;
