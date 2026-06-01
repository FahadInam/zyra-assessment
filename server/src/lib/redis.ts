import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

/**
 * Main Redis client — used for cache GET/SET/DEL and PUBLISH.
 * lazyConnect: true means it doesn't connect until the first command,
 * so the server starts even if Redis is temporarily unavailable.
 */
export const redis = new Redis(url, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

/**
 * Dedicated subscriber client.
 * A Redis client in subscriber mode can ONLY subscribe/unsubscribe —
 * it can't run regular commands, so we need a separate connection.
 */
export const subscriber = new Redis(url, { lazyConnect: true });

redis.on("error", (err) => console.warn("[redis] error:", err.message));
subscriber.on("error", (err) => console.warn("[redis subscriber] error:", err.message));

export async function connectRedis() {
  try {
    await redis.connect();
    await subscriber.connect();
    console.log("Redis connected");
  } catch (err) {
    // Redis is optional — the app works without it (cache misses, no real-time SSE)
    console.warn("Redis unavailable — caching and real-time updates disabled");
  }
}
