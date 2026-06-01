# Task 2 — Developer Guide

This guide explains every Task 2 requirement in detail: **why** each technology was chosen,
**what** each file does, and **how** every single line of code works.

---

## Table of Contents

1. [What changed and why — overview](#1-what-changed-and-why)
2. [Folder structure (what's new)](#2-folder-structure)
3. [Backend request logging](#3-backend-request-logging)
4. [Error middleware with request IDs](#4-error-middleware-with-request-ids)
5. [Backend integration test](#5-backend-integration-test)
6. [Frontend component test](#6-frontend-component-test)
7. [GitHub Actions CI](#7-github-actions-ci)
8. [Log Viewer page](#8-log-viewer-page)

---

## 1. What changed and why

### The problem these four things solve

In Task 1 the app works — but it has no visibility and no safety net.

- **No logging** — if the API breaks in production you have no record of what happened.
- **No request IDs** — if a user reports "I got an error", you can't find that specific request in any log.
- **No tests** — if you change a service function you won't know you broke something until a user tells you.
- **No CI** — every push to GitHub is untested until a human runs it manually.

Task 2 adds all four in the smallest, most production-correct way possible.

### Why pino for logging?

Several logging libraries exist for Node.js — `winston`, `morgan`, `bunyan`, `pino`. We chose `pino` because:

- **It is the fastest.** pino uses worker threads for formatting so writing a log line never blocks the request thread. In benchmarks it is 3–5× faster than `winston`.
- **It writes structured JSON.** Every log line is a JSON object, not a plain string. That means a log aggregator (Datadog, AWS CloudWatch, Grafana) can filter by any field: `level`, `reqId`, `statusCode`, etc.
- **`pino-http` does the HTTP part automatically.** One line of middleware and every request is logged — you don't touch the routes.
- **`pino-pretty` makes dev readable.** The same logger that writes machine JSON in production can write coloured human-readable output in development. Zero code change needed.

### Why vitest for testing?

`Jest` is the most common JavaScript test runner but it has a known compatibility issue with ESM (ES modules). Our backend uses `"type": "module"` in `package.json` which means every file is ESM. Getting Jest to work with ESM requires several config hacks. Vitest is:

- **ESM-native** — no hacks needed, works out of the box with our setup.
- **API-compatible with Jest** — `describe`, `it`, `expect`, `beforeAll` all work exactly the same way as Jest, so the tests look familiar.
- **Vite-powered** — the frontend already uses Vite, so Vitest reuses the same config and transform pipeline.

### Why supertest for HTTP tests?

`supertest` is a library that lets you make HTTP requests to an Express app **without actually starting a server on a port**. It handles the `listen()` → `request` → `response` cycle internally. This means:

- Tests run without occupying a real port.
- No need to wait for a server to start and stop.
- Fully parallel — multiple test files can each have their own `createApp()` instance.

### Why mongodb-memory-server?

We need a real MongoDB for the integration tests (not mocks) so we can test the full path: `route → service → Mongoose → MongoDB`. Options:

| Option | Problem |
|---|---|
| Use the real Atlas database | Tests would modify production data; requires network; slow |
| Mock Mongoose with jest-mock | You're testing the mock, not the real code |
| `mongodb-memory-server` | Spins up a real `mongod` binary in RAM; isolated per test run; no secrets needed |

`mongodb-memory-server` downloads a real MongoDB binary and runs it in memory. It's real Mongo with real query behaviour — not a fake.

---

## 2. Folder structure

Here is every new file added in Task 2:

```
server/
  logs/
    app.log              ← written at runtime (gitignored), read by GET /logs
  src/
    logger.ts            ← NEW — pino logger (writes to terminal + file)
    app.ts               ← NEW — createApp() factory (routes, middleware, error handler)
    index.ts             ← MODIFIED — now calls createApp() instead of building inline
    utils/
      http.ts            ← MODIFIED — errorBody() now accepts an optional requestId
    routes/
      logs.ts            ← NEW — GET /logs endpoint
      actionCenter.ts    ← MODIFIED — passes req.id into errorBody()
      tasks.ts           ← MODIFIED — passes req.id into errorBody()
    __tests__/
      api.test.ts        ← NEW — 6 integration tests
  vitest.config.ts       ← NEW — vitest config for the server

client/
  src/
    test/
      setup.ts           ← NEW — imports testing-library matchers
    components/
      __tests__/
        StudentCard.test.tsx  ← NEW — 3 component tests
    pages/
      LogsPage.tsx        ← NEW — the visual log viewer page
    App.tsx               ← MODIFIED — adds /logs route
    api/client.ts         ← MODIFIED — adds fetchLogs()
    components/
      Topbar.tsx          ← MODIFIED — adds Logs link
  vitest.config.ts        ← NEW — vitest config for the client

.github/
  workflows/
    ci.yml               ← NEW — GitHub Actions: typecheck + test on every push
```

---

## 3. Backend request logging

### Three files work together

```
logger.ts      → creates the pino logger (where to write, what format)
app.ts         → attaches pino-http middleware (when to log)
routes/logs.ts → reads the log file and serves it via the API
```

---

### `server/src/logger.ts` — line by line

```ts
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import pino from "pino";
```

`node:fs` and `node:path` are built-in Node.js modules (the `node:` prefix is the modern way to import them). `pino` is the logging library.

```ts
const logsDir = join(process.cwd(), "logs");
mkdirSync(logsDir, { recursive: true });
```

`process.cwd()` returns the current working directory — when you run `npm run dev` from `server/`, that's `D:/assessment/server`. So `logsDir` = `D:/assessment/server/logs`.

`mkdirSync` creates the folder. `{ recursive: true }` means "if the folder already exists, don't throw an error — just do nothing." This runs every time the server starts, so the `logs/` folder is always guaranteed to exist before we try writing to it.

```ts
export const LOG_FILE = join(logsDir, "app.log");
```

The full path to the log file. We export it so `routes/logs.ts` can import and read it.

```ts
const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug");
```

`process.env.NODE_ENV` is an environment variable. It's `"production"` on a deployed server and usually undefined (or `"development"`) locally. `??` is the nullish coalescing operator — "use what's on the right if the left is null or undefined." So if `LOG_LEVEL` isn't set: production defaults to `"info"`, development defaults to `"debug"`.

Log levels in pino (lowest to highest): `trace → debug → info → warn → error → fatal`. Setting a level means "only log this level and above." In development we want `debug` (verbose). In production we want `info` (less noisy).

```ts
export const logger = pino(
  { level },
  pino.transport({
    targets: isProd ? [ ... ] : [ ... ],
  }),
);
```

`pino.transport({ targets })` means "send log output to multiple destinations at the same time." Think of it like a printer that can print to both a file and a screen simultaneously.

**In development:**
```ts
{
  target: "pino-pretty",      // destination 1: the terminal (coloured, readable)
  options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" }
},
{ target: "pino/file", options: { destination: LOG_FILE } }  // destination 2: the file
```

`pino-pretty` transforms the raw JSON into something like:
```
[18:09:02] INFO: request completed
    reqId: "a3f1c2d4"
    statusCode: 200
    responseTime: 12
```

**In production:**
```ts
{ target: "pino/file", options: { destination: LOG_FILE } },         // file
{ target: "pino/file", options: { destination: 1 /* stdout fd */ } } // stdout
```

`destination: 1` means "write to file descriptor 1" — that's stdout (the terminal/process output). In production both destinations write plain JSON, which Docker / systemd / CloudWatch can collect.

---

### `server/src/app.ts` — the pino-http middleware (lines 24–34)

```ts
app.use(
  pinoHttp({
    logger,
```

`pinoHttp` is a middleware factory. You pass it your pino logger and it returns an Express middleware function. `app.use(...)` means "run this on every single request before anything else."

```ts
    genReqId: (req, res) => {
      const incoming = req.headers["x-request-id"];
```

`genReqId` is a function that runs for each request and decides what the request ID should be. `req.headers["x-request-id"]` checks if the caller already sent an ID (e.g. a load balancer or API gateway may have added one).

```ts
      const id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
```

HTTP headers can technically be sent multiple times for the same key (resulting in an array). `Array.isArray(incoming) ? incoming[0] : incoming` handles both cases. Then `|| randomUUID()` — if no ID was sent, generate a fresh random one. `randomUUID()` is built into Node.js, produces something like `"a3f1c2d4-50fa-4447-b123-de5914205d09"`.

```ts
      res.setHeader("X-Request-Id", id);
      return id;
    },
  }),
);
```

`res.setHeader` puts the ID into the **response** headers so the frontend/client receives it. `return id` gives it back to pino-http which then attaches it to every log line this request generates.

After this middleware runs, every request has:
- `req.id` — the request id (accessible in routes)
- `req.log` — a per-request child logger (every call to `req.log.info(...)` automatically includes the `reqId` in the output)

pino-http also automatically writes a log line when the response finishes, including method, URL, status code, and response time. You don't write any log code in the routes — it just happens.

---

### `server/src/routes/logs.ts` — line by line

```ts
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
```

`createReadStream` reads a file as a stream — meaning it doesn't load the whole file into RAM at once. Perfect for potentially large log files. `createInterface` wraps a stream so you can process it line by line. `existsSync` checks if the file exists without throwing an error.

```ts
router.get("/logs", async (req, res, next) => {
  const { LOG_FILE } = await import("../logger.js");
  const limit = Math.min(Number(req.query.limit) || 100, 500);
```

`req.query.limit` reads the URL parameter (e.g. `/logs?limit=50` → `"50"`). `Number(...)` converts the string to a number. `|| 100` provides a default. `Math.min(..., 500)` caps it at 500 so a caller can't request millions of lines and crash the server.

```ts
  if (!existsSync(LOG_FILE)) {
    return res.json({ entries: [], message: "No log file yet — make some requests first." });
  }
```

If the file doesn't exist yet (server just started, no requests made), return a friendly empty response instead of crashing.

```ts
  const lines: string[] = [];
  const rl = createInterface({ input: createReadStream(LOG_FILE), crlfDelay: Infinity });
```

`createReadStream(LOG_FILE)` opens the file. `createInterface` wraps it with a readline processor. `crlfDelay: Infinity` handles Windows line endings (`\r\n`) gracefully — the `Infinity` means "wait as long as needed to decide if `\r` is followed by `\n`."

```ts
  await new Promise<void>((resolve, reject) => {
    rl.on("line", (line) => {
      if (line.trim()) lines.push(line);
      if (lines.length > limit) lines.shift();
    });
    rl.on("close", resolve);
    rl.on("error", reject);
  });
```

This is the "circular buffer" pattern. We read line by line:
- `if (line.trim())` — skip empty lines
- `lines.push(line)` — add the line to our array
- `if (lines.length > limit) lines.shift()` — if we have more than `limit` lines, remove the oldest one from the front

By the time the file is fully read, `lines` contains exactly the **last `limit` lines** of the file, using only `limit` slots of memory regardless of how big the file is.

`rl.on("close", resolve)` — when the file is fully read, resolve the Promise. `rl.on("error", reject)` — if anything goes wrong, reject it (which `try/catch` will catch).

```ts
  const entries = lines
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean)
    .reverse();
```

Parse each line as JSON. If a line is malformed (e.g. the server was killed mid-write), `JSON.parse` throws — we catch it and return `null`. `.filter(Boolean)` removes all nulls. `.reverse()` puts the newest entries first.

---

## 4. Error middleware with request IDs

### `server/src/utils/http.ts`

**Before:**
```ts
export function errorBody(error: string, message: string) {
  return { error, message };
}
```

**After:**
```ts
export function errorBody(error: string, message: string, requestId?: string) {
  return requestId ? { error, message, requestId } : { error, message };
}
```

The `?` on `requestId?` makes it optional — callers that don't have a request ID (like the existing tests) still work without changes. When it IS provided, it's included in the response body. The ternary `requestId ? {...} : {...}` means we only add the `requestId` field when it actually exists — we don't want `{ error: "...", requestId: undefined }` in the response.

### How it's used in routes

In `routes/actionCenter.ts`:
```ts
res.status(404).json(
  errorBody("STUDENT_NOT_FOUND", `No student found with id "${req.params.id}".`, String(req.id))
);
```

`req.id` is set by pino-http (as we set up in `app.ts`). `String(req.id)` converts it to a plain string (pino types it as `string | number | object`). Now the response body looks like:
```json
{
  "error": "STUDENT_NOT_FOUND",
  "message": "No student found with id \"bad_id\".",
  "requestId": "a3f1c2d4-50fa-4447-b123-de5914205d09"
}
```

### The error handler in `app.ts` (lines 51–64)

```ts
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
```

The critical thing: this function has **four parameters**. Express uses the number of parameters to decide whether a middleware is a regular middleware (3 params) or an error handler (4 params). If you write 3 params, Express treats it as regular. You must have exactly 4 for it to catch errors. `_next` is unused but must be there — that's why it has an underscore prefix.

```ts
  req.log.error({ err }, "request failed");
```

`req.log` is the per-request child logger created by pino-http. Every message logged with `req.log` automatically includes the `reqId`. `{ err }` passes the error object as structured data alongside the message — pino serialises it with the stack trace. This means the log file contains:

```json
{
  "level": 50,
  "reqId": "a3f1c2d4-...",
  "err": { "type": "Error", "message": "...", "stack": "..." },
  "msg": "request failed"
}
```

```ts
  if (err instanceof SyntaxError && "body" in err) {
```

`express.json()` middleware throws a `SyntaxError` with a `body` property when the request body is invalid JSON (e.g. `{broken json`). This specific check catches only that case, not all SyntaxErrors. Without this, a bad JSON body would return a generic 500 instead of a helpful 400.

---

## 5. Backend integration test

### What is an integration test vs a unit test?

A **unit test** tests one function in isolation, with all dependencies replaced by fakes (mocks). Fast, but it doesn't prove the real system works.

An **integration test** tests multiple layers together — route → service → database — using real dependencies. Slower, but it proves the actual system works end to end.

We chose integration tests because the most important behaviour in this API is the **full path**: does a real HTTP request go through the route, through the service, through Mongoose, into MongoDB, and come back correctly? A unit test can't verify that.

---

### `server/vitest.config.ts` — line by line

```ts
export default defineConfig({
  test: {
    environment: "node",
```

`environment: "node"` means "run tests in a Node.js environment." The alternative is `"jsdom"` (a fake browser). Server code must run in Node, not a browser simulation.

```ts
    include: ["src/**/*.test.ts"],
```

"Only run files matching this pattern." The `**` means "any subfolder depth." So `src/__tests__/api.test.ts` matches.

```ts
    testTimeout: 30_000,
    hookTimeout: 60_000,
```

`mongodb-memory-server` needs to download a real MongoDB binary the **first time** it runs (it caches it after). This can take 20–30 seconds on a slow connection. `testTimeout` is how long a single `it(...)` test can run before failing. `hookTimeout` is how long `beforeAll`/`afterAll` can take. The defaults (5s/10s) are too short for the MongoDB download, so we increase them.

---

### `server/src/__tests__/api.test.ts` — line by line

```ts
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { reseed } from "../data/seed.js";
import { connectDB } from "../db/connection.js";
import { getActionCenter } from "../services/actionCenter.js";
```

All four key dependencies:
- `MongoMemoryServer` — spins up a real MongoDB in RAM
- `request` from supertest — makes HTTP requests to Express apps without a real port
- `createApp` — our app factory (this is why we extracted it from `index.ts`)
- `reseed` — the same function the app uses to populate the DB; we reuse it here

```ts
const app = createApp();
let mongod: MongoMemoryServer;
```

`createApp()` is called once at the top of the file, outside any test. This creates the Express app with all middleware and routes wired up. `mongod` is declared with `let` so it can be assigned inside `beforeAll` and used in `afterAll`.

```ts
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
  await reseed();
});
```

`beforeAll` runs once before any test in this file. Three things happen:

1. `MongoMemoryServer.create()` — starts a real MongoDB process in memory. Returns an object with `.getUri()` which gives a connection string like `mongodb://127.0.0.1:PORT/test`.
2. `connectDB(mongod.getUri())` — connects our Mongoose models to this in-memory DB (reusing the exact same function the real server uses).
3. `reseed()` — wipes and repopulates the DB with the original 3 students, 13 tasks, 8 messages. Now the DB is in a known state.

```ts
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
```

Cleanup after all tests. First disconnect Mongoose (closes the connection), then stop the MongoDB process. Without this, the test process would hang waiting for the connection to close.

---

#### Test 1 — the happy path

```ts
it("returns the aggregated payload for a known student", async () => {
  const res = await request(app).get("/students/stu_001/action-center");

  expect(res.status).toBe(200);
  expect(res.body.student.name).toBe("Maya Patel");
  expect(res.body.unreadMessagesCount).toBe(2);
  expect(res.body.taskSummary.total).toBe(5);
  expect(res.headers["x-request-id"]).toBeTruthy();
});
```

`request(app).get("/students/stu_001/action-center")` — supertest creates an HTTP connection to the Express app, sends the GET request, and returns the full response. No server port needed.

`res.status` — the HTTP status code (200, 404, etc.).
`res.body` — the parsed JSON response body.
`res.headers` — the response headers.

`toBe(200)` — strict equality. `toBeTruthy()` — passes if the value is anything truthy (not null, undefined, 0, "", false). We use `toBeTruthy()` for the request ID because we don't know the exact UUID, just that it must exist.

This test verifies the entire aggregation chain: the route received the request, called the service, the service queried MongoDB, got the student, their tasks and messages, calculated unread count and task summary, and returned them correctly.

#### Test 2 — write then read (the most important test)

```ts
it("updates a task and the change is reflected on the next read", async () => {
  const before = await request(app).get("/students/stu_001/action-center");
  const completedBefore = before.body.taskSummary.completed;

  const patch = await request(app)
    .patch("/tasks/tsk_001/status")
    .send({ status: "completed" });

  expect(patch.status).toBe(200);
  expect(patch.body.status).toBe("completed");

  const after = await request(app).get("/students/stu_001/action-center");
  expect(after.body.taskSummary.completed).toBe(completedBefore + 1);
});
```

This is the most meaningful test because it verifies a **write followed by a read**. It proves:
1. The PATCH actually persisted to MongoDB (not just returned a fake response).
2. The GET re-reads from MongoDB on every call (not from a cache).
3. The `taskSummary` derivation is recalculated correctly after the write.

We store `completedBefore` rather than hardcoding `1` because an earlier test run in the same suite might have already changed some tasks. By comparing to the baseline we make the test resilient to ordering.

#### Test 3 — validation error with requestId

```ts
it("rejects an invalid status with 400 + request id", async () => {
  const res = await request(app)
    .patch("/tasks/tsk_002/status")
    .send({ status: "not_a_real_status" });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe("INVALID_STATUS");
  expect(res.body.requestId).toBeTruthy();
});
```

`.send({ status: "not_a_real_status" })` sets the request body as JSON. This verifies the validator in `routes/tasks.ts` fires and that the error response includes a `requestId`.

#### Test 5 — deterministic urgency with injected date

```ts
describe("urgency derivation (deterministic, injected date)", () => {
  it("flags an at-risk student with overdue urgent work as high urgency", async () => {
    await reseed();
    const result = await getActionCenter("stu_001", new Date("2026-06-01T00:00:00Z"));
    expect(result?.urgency).toBe("high");
  });
});
```

This test calls the service function directly (not via HTTP) because we want to test the urgency logic specifically, isolated from routing.

The critical detail: `new Date("2026-06-01T00:00:00Z")` is a fixed date. Maya's tasks include "Attendance improvement plan" due 2026-05-28 and "Submit FAFSA" due 2026-06-05. With `today = 2026-06-01`, the attendance task is overdue. The test will give the **same result every time**, no matter what the real system clock says when the test runs. This is called a **deterministic test**.

`await reseed()` is called first because the earlier write→read test marked `tsk_001` as completed. Without reseed, Maya might not have enough overdue tasks to trigger "high" urgency.

---

## 6. Frontend component test

### The philosophy: test behaviour, not implementation

Bad approach (testing implementation):
```ts
// Fragile — breaks if you rename a CSS class or restructure HTML
expect(wrapper.find('.profile-card .student-name').text()).toBe('Maya Patel')
```

Good approach (testing behaviour — what Testing Library enforces):
```ts
// Stable — doesn't care about HTML structure, only what the user sees
expect(screen.getByText("Maya Patel")).toBeInTheDocument()
```

Testing Library's philosophy: "Test your software the way users use it." Find elements by the text visible to the user, not by internal class names or IDs.

---

### `client/vitest.config.ts` — line by line

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
```

The `react()` plugin handles JSX transformation — it converts `.tsx` files with JSX syntax into plain JavaScript that can run. Without this, Vitest would fail on the first `<div>`.

Note this is a separate file from `vite.config.ts`. The dev/build config includes the Tailwind plugin; the test config doesn't need it (no CSS in tests).

```ts
  test: {
    environment: "jsdom",
```

`"jsdom"` installs a fake browser DOM (the `jsdom` package) into the test environment. This means `document`, `window`, `HTMLElement` etc. all exist and work, even though we're in Node.js. Without this, `render(<StudentCard />)` would crash because there's no `document.body` to render into.

```ts
    globals: true,
```

Makes `describe`, `it`, `expect` globally available without importing them. Mirrors Jest's default behaviour.

```ts
    setupFiles: ["./src/test/setup.ts"],
```

Runs this file before every test file. That's where we import the extra matchers.

---

### `client/src/test/setup.ts` — line by line

```ts
import "@testing-library/jest-dom/vitest";
```

`@testing-library/jest-dom` adds extra matchers to `expect`. Without this:
```ts
expect(screen.getByText("Maya Patel")).toBeInTheDocument() // ❌ toBeInTheDocument is not a function
```

With it:
```ts
expect(screen.getByText("Maya Patel")).toBeInTheDocument() // ✅ works
```

The `/vitest` suffix imports the version that registers with Vitest's `expect` specifically.

```ts
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

After every single test, `cleanup()` removes everything that was rendered from the DOM. Without this, elements from test 1 would still be in the DOM when test 2 runs, potentially causing false positives ("I can see 'Maya Patel' because it was rendered by the previous test, not the current one").

---

### `client/src/components/__tests__/StudentCard.test.tsx` — line by line

```ts
const student: StudentRosterEntry = {
  id: "stu_001",
  name: "Maya Patel",
  // ...
  summary: {
    openTasks: 2,
    unreadMessages: 2,
    urgency: "high",
    nextTask: {
      title: "Submit FAFSA application",
      dueDate: "2026-06-05",
      isOverdue: false,
    },
  },
};
```

This is the test's **fixture** — a hardcoded piece of data that is always the same. We control every value so tests are predictable. Notice `dueDate: "2026-06-05"` — the card shows the **task title** ("Submit FAFSA application") not the relative date string ("Due in 3 days") because the date string would change with the real clock and make the test fail tomorrow.

---

#### Test 1 — renders key details

```ts
it("renders the student's key details", () => {
  render(<StudentCard student={student} onOpen={vi.fn()} onMessage={vi.fn()} />);
```

`render(...)` mounts the component into jsdom's fake DOM.
`vi.fn()` creates an empty mock function — we just need something to pass as the prop, we don't assert on it here.

```ts
  expect(screen.getByText("Maya Patel")).toBeInTheDocument();
```

`screen.getByText("Maya Patel")` scans the DOM for an element with exactly that text. If it doesn't exist, the test fails immediately with a helpful error. `toBeInTheDocument()` is the assertion — it confirms the element is actually in the DOM (not just selected from outside it).

```ts
  expect(screen.getByText(/open task/i)).toBeInTheDocument();
```

`/open task/i` is a regular expression. The `i` flag makes it case-insensitive. This matches "2 open tasks" or "open task" — we don't need to specify the exact count, just that the text is present.

```ts
  expect(screen.getByText("Submit FAFSA application")).toBeInTheDocument();
```

Verifies the next-task title renders. We check the title (stable), not the date string (unstable).

---

#### Test 2 — click to open profile

```ts
it("opens the profile when the card is clicked", async () => {
  const onOpen = vi.fn();
  render(<StudentCard student={student} onOpen={onOpen} onMessage={vi.fn()} />);

  await userEvent.click(screen.getByText("Maya Patel"));

  expect(onOpen).toHaveBeenCalledWith("stu_001");
});
```

`vi.fn()` — a spy function. It records every time it was called and with what arguments.
`userEvent.click(...)` — simulates a real user click, including all the browser events that a real click fires (mousedown, mouseup, click). This is more realistic than the lower-level `fireEvent.click()`.
`toHaveBeenCalledWith("stu_001")` — asserts the function was called exactly once with `"stu_001"` as the argument.

`async/await` is needed because `userEvent` simulates real browser events which are asynchronous.

---

#### Test 3 — Message button does NOT trigger the card click

```ts
it("fires onMessage (and NOT onOpen) when the Message button is clicked", async () => {
  const onOpen = vi.fn();
  const onMessage = vi.fn();
  render(<StudentCard student={student} onOpen={onOpen} onMessage={onMessage} />);

  await userEvent.click(screen.getByRole("button", { name: /message/i }));

  expect(onMessage).toHaveBeenCalledWith("stu_001");
  expect(onOpen).not.toHaveBeenCalled();
});
```

`screen.getByRole("button", { name: /message/i })` — finds a `<button>` element whose accessible name (label, aria-label, or text content) matches "message". This is the best way to find interactive elements — it finds what a screen reader and keyboard user would find.

`expect(onOpen).not.toHaveBeenCalled()` — this is the key assertion. In `StudentCard.tsx`, the Message button calls `e.stopPropagation()` to prevent the click from bubbling up to the card element which would trigger `onOpen`. This test specifically verifies that `stopPropagation` is working. If someone accidentally removes it from the component, this test fails — and they know exactly what broke.

---

## 7. GitHub Actions CI

### `.github/workflows/ci.yml` — line by line

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["main"]
```

`on: push branches: ["**"]` — run on every push to any branch. `**` is a glob meaning "any". `pull_request branches: ["main"]` — also run when a PR targets `main`. The `name: CI` is just what shows in the GitHub Actions UI.

```yaml
jobs:
  server:
    name: Server — typecheck + test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
```

`jobs` defines parallel tasks. `server` and `client` run at the same time on separate machines. `runs-on: ubuntu-latest` — a fresh Ubuntu virtual machine on every run. `working-directory: server` means every `run: ...` command in this job runs from the `server/` folder automatically.

```yaml
    steps:
      - uses: actions/checkout@v4
```

`uses` runs a pre-built GitHub Action. `actions/checkout` checks out your repository code onto the CI machine. Without this, the machine is empty.

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: server/package-lock.json
```

`actions/setup-node` installs Node.js version 20. `cache: npm` tells GitHub to cache the `node_modules` folder between runs — if `package-lock.json` hasn't changed, it restores the cached modules instead of downloading them again (saves 1–2 minutes per run). `cache-dependency-path` tells it to key the cache on the server's lockfile specifically (not the root one).

```yaml
      - run: npm ci
```

`npm ci` installs dependencies exactly as specified in `package-lock.json` — unlike `npm install` which may update packages. This is what you always use in CI to get reproducible, deterministic installs.

```yaml
      - run: npm run typecheck
      - run: npm test
```

Run typecheck first (fast, catches type errors), then tests. If typecheck fails, the tests don't even run — saves time.

`mongodb-memory-server` downloads its MongoDB binary on first run. It caches it in `~/.cache/mongodb-binaries` on the CI machine. GitHub Actions also caches this directory (via the npm cache), so subsequent runs are fast.

---

## 8. Log Viewer page

The log viewer (`client/src/pages/LogsPage.tsx`) is a React Query powered page that polls `GET /logs` every 5 seconds. The key design decisions:

- **Auto-refresh** (`refetchInterval: 5000`) — you can watch new requests appear in real time without manually refreshing.
- **Click to expand** — each row is a `<tr>` with a collapsed state. Clicking it shows the full raw JSON that pino wrote, which is useful for debugging.
- **Level filter + count pills** — clicking "Error · 2" filters to only error entries. The counts update as new logs arrive.
- **Circular buffer** — the `GET /logs` endpoint never loads the whole file; it reads only the last N lines. The frontend caps at 500 via the dropdown.

The page lives at `/logs` and is linked from the topbar's **Logs** button.
