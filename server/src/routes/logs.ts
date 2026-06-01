import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { Router } from "express";

const router = Router();

/**
 * GET /logs?limit=100
 * Returns the most recent `limit` log entries from logs/app.log as a JSON
 * array — newest first. Each entry is the parsed JSON object pino wrote.
 *
 * This endpoint is what the frontend Log Viewer page calls.
 */
router.get("/logs", async (req, res, next) => {
  try {
    const { LOG_FILE } = await import("../logger.js");
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    if (!existsSync(LOG_FILE)) {
      return res.json({ entries: [], message: "No log file yet — make some requests first." });
    }

    // Stream the file line by line (memory-efficient for large files) and keep
    // only the last `limit` lines in a circular buffer.
    const lines: string[] = [];
    const rl = createInterface({ input: createReadStream(LOG_FILE), crlfDelay: Infinity });

    await new Promise<void>((resolve, reject) => {
      rl.on("line", (line) => {
        if (line.trim()) lines.push(line);
        if (lines.length > limit) lines.shift(); // keep a rolling window
      });
      rl.on("close", resolve);
      rl.on("error", reject);
    });

    // Parse each JSON line; skip any that are malformed.
    const entries = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // newest first

    return res.json({ entries, total: entries.length });
  } catch (err) {
    next(err);
  }
});

export default router;
