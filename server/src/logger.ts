import { mkdirSync } from "node:fs";
import { join } from "node:path";
import pino from "pino";

// Ensure the logs directory exists next to the server root.
const logsDir = join(process.cwd(), "logs");
mkdirSync(logsDir, { recursive: true });

export const LOG_FILE = join(logsDir, "app.log");

const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug");

/**
 * App-wide pino logger.
 *
 * Always writes structured JSON lines to  logs/app.log  (this is what the
 * /logs endpoint reads back and what you'd ship to a log aggregator in prod).
 *
 * In development it ALSO writes pretty, colourised output to stdout so the
 * terminal is readable.  In production stdout is plain JSON too (easy to pipe
 * to journald / Docker log driver / CloudWatch etc.).
 */
export const logger = pino(
  { level },
  pino.transport({
    targets: isProd
      ? [
          // production: JSON to stdout + JSON to file
          { target: "pino/file", level, options: { destination: LOG_FILE } },
          { target: "pino/file", level, options: { destination: 1 /* stdout fd */ } },
        ]
      : [
          // development: pretty to stdout + JSON to file for the log viewer
          {
            target: "pino-pretty",
            level,
            options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
          },
          { target: "pino/file", level, options: { destination: LOG_FILE } },
        ],
  }),
);
