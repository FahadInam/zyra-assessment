import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

/**
 * App-wide logger.
 * - In production: plain JSON lines (one object per line) — ideal for log
 *   aggregators (Datadog, CloudWatch, etc.) and very low overhead.
 * - In development: pretty, colourised, human-readable output via pino-pretty.
 */
export const logger = pino(
  isProd
    ? { level: process.env.LOG_LEVEL ?? "info" }
    : {
        level: process.env.LOG_LEVEL ?? "debug",
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      },
);
