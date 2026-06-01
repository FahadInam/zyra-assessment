# Redis — Developer Guide

This file explains what Redis is, why it was added, and exactly how every piece of the implementation works. Read this if you want to understand the caching layer or the real-time update flow.

---

## What is Redis

Redis is an in-memory data store. Unlike MongoDB which writes data to disk, Redis keeps everything in RAM, which makes reads and writes extremely fast (sub-millisecond). It is commonly used for two things:

**Caching** — store the result of an expensive database query so subsequent requests can get the answer without hitting the database again.

**Pub-sub (publish-subscribe)** — one part of the system publishes a message on a named channel, and any number of subscribers receive it instantly. This is the standard way to broadcast events across multiple server instances or connections.

In this app we use both.

---

## Why Redis was added

**Caching problem:** `GET /students` queries all three MongoDB collections, computes urgency and summaries for every student, and assembles the result. For 3 students it is fast. For a real counselor with 200 students, and 10 counselors all loading the dashboard simultaneously, that becomes 2000 independent MongoDB queries per minute for identical data that barely changes. Redis lets us compute it once, serve it from memory for 60 seconds, and only go back to MongoDB when the data actually changes.

**Real-time problem:** When a counselor marks a task complete, any other counselor viewing that same student in another tab should see the change automatically. Without pub-sub there is no way to notify connected browsers. With Redis pub-sub, the server broadcasts a lightweight event and every connected client picks it up immediately.

---

## Files involved

```
server/src/lib/redis.ts          Redis client setup and connectRedis()
server/src/routes/events.ts      SSE endpoint — keeps browser connections open
server/src/services/actionCenter.ts  cache read/write in getStudentRoster()
                                     publish in updateTaskStatus()
client/src/hooks/useSSE.ts       opens the EventSource, listens, invalidates cache
client/src/pages/StudentDetailPage.tsx  calls useSSE() when mounted
```

---

## Backend

### `server/src/lib/redis.ts`

```ts
import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(url, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

export const subscriber = new Redis(url, { lazyConnect: true });
```

We create two separate clients rather than one. This is a Redis requirement: once a client calls `subscribe()` it enters subscriber mode and can only send subscribe-related commands. It cannot do GET, SET, PUBLISH, or anything else. So we need one client for regular operations (cache reads/writes and publishing events) and a dedicated one purely for subscribing.

`lazyConnect: true` means the client does not actually open a TCP connection until the first command is sent. This lets the server start up cleanly even if Redis is temporarily unavailable.

`maxRetriesPerRequest: 1` means if a cache operation fails (Redis is down), it fails fast after one attempt rather than retrying for 30 seconds. A failed cache read just falls through to MongoDB — the request still succeeds, just slightly slower.

```ts
redis.on("error", (err) => console.warn("[redis] error:", err.message));
subscriber.on("error", (err) => console.warn("[redis subscriber] error:", err.message));
```

Without these handlers, ioredis throws unhandled `error` events that crash the Node process. The handlers catch them and log a warning instead, so a Redis disconnection does not take down the app.

```ts
export async function connectRedis() {
  try {
    await redis.connect();
    await subscriber.connect();
    console.log("Redis connected");
  } catch (err) {
    console.warn("Redis unavailable — caching and real-time updates disabled");
  }
}
```

`connectRedis()` is called from `index.ts` during startup, after MongoDB connects and the DB is seeded. The `try/catch` makes Redis entirely optional. If the connection fails, the warning is logged and the app continues. Every Redis call in the rest of the codebase uses `.catch(() => {})` (fire-and-forget) so a Redis failure never propagates to a failed HTTP response.

---

### Caching in `server/src/services/actionCenter.ts`

Two constants define the cache behaviour:

```ts
const ROSTER_CACHE_KEY = "roster";
const ROSTER_TTL_SECONDS = 60;
```

`ROSTER_CACHE_KEY` is the key we store the roster under in Redis. There is only one roster per counselor (all students), so a single key is enough. In a multi-counselor app you would key it by counselor id: `roster:${counselorId}`.

`ROSTER_TTL_SECONDS = 60` means Redis automatically expires and deletes the key after 60 seconds. Even if we never explicitly invalidate it, the data will be at most 60 seconds stale. This is a safety net — we also explicitly delete it on every task update.

**Cache read in `getStudentRoster()`:**

```ts
try {
  const cached = await redis.get(ROSTER_CACHE_KEY);
  if (cached) return JSON.parse(cached) as StudentRosterEntry[];
} catch {
  // Redis unavailable — fall through to DB
}
```

`redis.get(key)` returns the stored string or `null` if the key does not exist (cache miss) or has expired. If we get a hit, we parse the JSON and return it immediately. The MongoDB queries, aggregation, and summary computation are all skipped. If Redis throws (connection lost, etc.), we catch it silently and continue to the database query below.

**Cache write after fetching from MongoDB:**

```ts
redis.setex(ROSTER_CACHE_KEY, ROSTER_TTL_SECONDS, JSON.stringify(result)).catch(() => {});
return result;
```

`redis.setex(key, seconds, value)` stores a string with an expiry. We call it without `await` — the response is returned to the client without waiting for Redis to confirm the write. The `.catch(() => {})` silently discards any error. If Redis is down, the data is not cached this time, but the response still reaches the client immediately.

**Cache invalidation in `updateTaskStatus()`:**

```ts
redis.del(ROSTER_CACHE_KEY).catch(() => {});
redis
  .publish(`student:${task.studentId}`, JSON.stringify({ type: "task_updated", taskId }))
  .catch(() => {});
```

`redis.del(key)` deletes the cached roster. The next `GET /students` will miss the cache and rebuild from MongoDB, picking up the updated task summaries.

`redis.publish(channel, message)` sends a message to the Redis channel named `student:stu_001` (or whichever student was updated). Any subscriber listening to that channel receives the message. This is how the SSE endpoint gets notified. Both calls are fire-and-forget.

---

### `server/src/routes/events.ts`

This is the Server-Sent Events (SSE) endpoint. SSE is a browser protocol for one-directional streaming: the server sends events to the browser over a regular HTTP connection that stays open indefinitely.

```ts
const connections = new Map<string, Set<SseClient>>();
```

This in-memory map tracks all currently open browser connections, organised by Redis channel name. For example, if two counselors are both viewing `stu_001`, the map contains:

```
"student:stu_001" → Set { res_counselorA, res_counselorB }
```

When a Redis message arrives for that channel, both response objects get the event.

```ts
subscriber.on("message", (channel: string, message: string) => {
  connections.get(channel)?.forEach((res) => {
    res.write(`data: ${message}\n\n`);
  });
});
```

This listener is registered once when the module loads. Every time Redis delivers a message on any subscribed channel, it looks up all the response objects for that channel and writes the SSE-formatted message to each one. The `data: ...\n\n` format is the SSE wire protocol — the browser's `EventSource` API parses this automatically.

```ts
router.get("/events/:studentId", (req: Request, res: Response) => {
  const channel = `student:${req.params.studentId}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
```

These four headers tell the browser this is an SSE connection. `Content-Type: text/event-stream` activates the browser's EventSource parser. `Cache-Control: no-cache` prevents any proxy from buffering the response. `Connection: keep-alive` keeps the TCP connection open. `res.flushHeaders()` sends the headers immediately without waiting for body content — without this the browser would not know the stream had started.

```ts
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 30_000);
```

SSE lines starting with `:` are comments and are ignored by the browser. We send one every 30 seconds to prevent load balancers and proxies from closing idle connections (many have a 60-second idle timeout).

```ts
  if (!connections.has(channel)) {
    connections.set(channel, new Set());
    subscriber.subscribe(channel).catch(() => {});
  }
  connections.get(channel)!.add(res);
```

If this is the first browser connecting for this student, we tell the Redis subscriber client to start listening on that channel. If there are already listeners, we just add the new response to the set. This means we only have one Redis subscription per student channel regardless of how many browsers are watching.

```ts
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
```

When the browser closes the connection (navigation, tab close, page refresh), the `close` event fires on the request. We clean up the heartbeat timer, remove this response from the listeners set, and if there are no more listeners for this channel we unsubscribe from Redis too. This prevents memory leaks and unnecessary Redis subscriptions.

---

## Frontend

### `client/src/hooks/useSSE.ts`

```ts
export function useSSE(studentId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource(`/events/${studentId}`);
```

`EventSource` is a browser built-in API. When you create one with a URL, the browser opens an HTTP GET to that URL and keeps the connection open, waiting for server-sent events. This goes through the Vite dev proxy to the Express server's `/events/:studentId` endpoint.

```ts
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string };
        if (data.type === "task_updated") {
          queryClient.invalidateQueries({ queryKey: actionCenterKey(studentId) });
          queryClient.invalidateQueries({ queryKey: ["students"] });
        }
      } catch {
        // malformed event — ignore
      }
    };
```

Every time the server writes a `data: {...}\n\n` line, `onmessage` fires with the parsed event. We check the `type` field and if it is `task_updated` we tell React Query to invalidate two cache entries: the action-center for this student (so the task list and summary refresh) and the roster (so the card grid shows the updated open-task count). React Query immediately refetches both in the background, and the UI updates without any user action.

```ts
    return () => es.close();
  }, [studentId, queryClient]);
}
```

The cleanup function returned from `useEffect` runs when the component unmounts — when the counselor navigates away from the student detail page. `es.close()` closes the HTTP connection and triggers the `req.on("close")` handler on the server, which removes the listener and potentially unsubscribes from Redis.

The dependency array `[studentId, queryClient]` means if the student changes (e.g. navigating from `stu_001` to `stu_002`), the effect re-runs: the old `EventSource` is closed and a new one is opened for the new student.

### Usage in `client/src/pages/StudentDetailPage.tsx`

```ts
const query = useActionCenter(studentId);
useSSE(studentId);
```

One line. The hook handles the connection lifecycle automatically — opens when the page mounts, closes when it unmounts.

---

## The full flow end to end

```
Counselor A is on /students/stu_001 in Tab A
Counselor B is on /students/stu_001 in Tab B (or incognito)

Both tabs: useSSE("stu_001") opens EventSource → GET /events/stu_001
Server: registers both res objects under "student:stu_001" in the connections map
Server: subscriber.subscribe("student:stu_001") called once

Counselor A changes a task status
  → PATCH /tasks/tsk_001/status { status: "completed" }
  → updateTaskStatus() updates MongoDB
  → redis.del("roster")               — cache cleared
  → redis.publish("student:stu_001", '{"type":"task_updated","taskId":"tsk_001"}')
                                       — Redis delivers to subscriber

Server (subscriber.on("message")):
  → finds "student:stu_001" in connections map
  → writes `data: {"type":"task_updated","taskId":"tsk_001"}\n\n` to both res objects

Tab A: es.onmessage fires → queryClient.invalidateQueries → refetches action-center
Tab B: es.onmessage fires → queryClient.invalidateQueries → refetches action-center

Both tabs now show the updated task status without any refresh.
```

---

## What happens when Redis is not available

Every Redis call in the backend is either wrapped in `try/catch` (cache reads) or uses `.catch(() => {})` (cache writes, publish, subscribe/unsubscribe). This means:

`getStudentRoster()` — cache miss, falls through to MongoDB, result is returned. Slightly slower but correct.

`updateTaskStatus()` — `redis.del()` fails silently (stale cache will expire on its own after 60s). `redis.publish()` fails silently (no SSE events sent, browsers do not update live).

`connectRedis()` — logs a warning and returns. The app starts normally.

The SSE connections (`/events/:studentId`) still open, but no events ever arrive. The browser's `EventSource` will periodically reconnect, keep getting an open connection with heartbeats, but never receive a message. When Redis comes back online, events start flowing again automatically.

The app degrades gracefully: slower roster loads and no real-time updates, but nothing breaks.
