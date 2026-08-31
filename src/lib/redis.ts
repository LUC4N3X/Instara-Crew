import IORedis from "ioredis";

/**
 * Lazy connection: importing this module (build time, Next route analysis) must
 * not open a socket. BullMQ connects on first command.
 */
export const redis = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: true,
  retryStrategy: (times) => Math.min(times * 500, 5_000),
});

redis.on("error", (error) => {
  console.error("[redis]", error.message);
});
