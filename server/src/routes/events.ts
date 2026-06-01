import { Router, type Request, type Response } from "express";
import { subscriber } from "../lib/redis.js";

const router = Router();

/**
 * GET /events/:studentId
 *
 * Server-Sent Events endpoint. The frontend connects here when viewing a
 * student detail page. When that student's tasks change, the server publishes
 * a message on the Redis channel "student:{id}" and this endpoint forwards it
 * to all connected clients as an SSE event.
 *
 * The client then tells React Query to refetch, so the UI updates live without
 * a manual refresh.
 *
 * One shared `subscriber` client handles all channels — we track which
 * response objects are listening to each channel in a local Map.
 */

type SseClient = Response;
const connections = new Map<string, Set<SseClient>>();

// When a message arrives on any subscribed channel, forward to all listeners.
subscriber.on("message", (channel: string, message: string) => {
  connections.get(channel)?.forEach((res) => {
    res.write(`data: ${message}\n\n`);
  });
});

router.get("/events/:studentId", (req: Request, res: Response) => {
  const channel = `student:${req.params.studentId}`;

  // SSE requires these specific headers.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // send headers immediately so the browser opens the stream

  // Send a comment line every 30 s to keep the connection alive through
  // proxies and load balancers that close idle connections.
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 30_000);

  // Register this response as a listener for the channel.
  if (!connections.has(channel)) {
    connections.set(channel, new Set());
    subscriber.subscribe(channel).catch(() => {});
  }
  connections.get(channel)!.add(res);

  // Clean up when the browser closes the connection.
  req.on("close", () => {
    clearInterval(heartbeat);
    const listeners = connections.get(channel);
    if (listeners) {
      listeners.delete(res);
      if (listeners.size === 0) {
        connections.delete(channel);
        subscriber.unsubscribe(channel).catch(() => {});
      }
    }
  });
});

export default router;
