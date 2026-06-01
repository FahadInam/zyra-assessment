# Counselor Student Action Center

A small full-stack feature for school counselors. You land on a **card grid of students**
(photo, grade/GPA, open tasks, next deadline, urgency), then open one to see their full action
center — profile, tasks, unread messages, and how urgent things are. From there you can open a
message as a chat thread and change a task's status inline.

**Stack**

- Frontend: React + TypeScript + Vite, Tailwind v4, React Query (server data) + Zustand (UI state)
- Backend: Node + Express + TypeScript, MongoDB via Mongoose

Design is loosely based on [Zyra](https://www.zyra-ai.com/partner/counselors) — light, blue
accent, rounded cards. The layout is responsive down to mobile.

> For a deep dive into the backend internals and the complete state-management flows, see
> [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

## Getting it running

You'll need Node 18+ and a MongoDB connection string (local or a free Atlas cluster).

**Quick start (both at once)** — from the repo root:

```bash
cp server/.env.example server/.env   # then put your MONGODB_URI in it
npm run install:all                  # installs root + server + client deps
npm run dev                          # runs the API (4000) and client (5173) together
```

`npm run dev` uses `concurrently` to start both; logs are prefixed `server`/`client`. Or run
them separately:

**1. Backend**

```bash
cd server
cp .env.example .env     # then put your MONGODB_URI in .env
npm install
npm run dev              # http://localhost:4000
```

On the first run it seeds the DB from the mock data (only if it's empty, so re-running is fine).
Quick check: `curl http://localhost:4000/health`.

**2. Frontend**

```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

Vite proxies the API paths (`/students`, `/tasks`, `/reset`) to the backend, so there's nothing
else to configure. Because `/students/:id` is also a client route, the proxy only forwards data
requests (`fetch`) and lets browser navigations fall through to the SPA — so deep links like
`/students/stu_002` load correctly on refresh.

For production builds: `npm run build` in either folder (`npm start` for the server,
`npm run preview` for the client).

## API

Three endpoints, base URL `http://localhost:4000`.

### `GET /students`

The roster for the card grid. Each student includes a small computed `summary` so the cards
have something useful to show (open task count, unread messages, urgency, and the nearest deadline).

```jsonc
[
  {
    "id": "stu_001", "name": "Maya Patel", "email": "maya.patel@school.edu",
    "grade": 11, "gpa": 3.2, "counselorId": "csl_001", "enrollmentStatus": "at_risk",
    "summary": {
      "openTasks": 4,
      "unreadMessages": 2,
      "urgency": "high",
      "nextTask": { "title": "Attendance improvement plan", "dueDate": "2026-05-28", "isOverdue": true }
    }
  }
]
```

### `GET /students/:id/action-center`

Everything the page needs in one call. `404` with `STUDENT_NOT_FOUND` if the id is unknown.

```jsonc
{
  "student": { "id": "stu_001", "name": "Maya Patel", "grade": 11, "gpa": 3.2,
               "enrollmentStatus": "at_risk", "...": "..." },
  "tasks": [
    { "id": "tsk_003", "title": "Attendance improvement plan",
      "status": "todo", "priority": "urgent", "dueDate": "2026-05-28",
      "isOverdue": true, "...": "..." }
  ],
  "taskSummary": { "total": 5, "todo": 3, "inProgress": 1, "completed": 1, "overdue": 2 },
  "unreadMessagesCount": 2,
  "messages": [ "...newest first" ],
  "urgency": "high"
}
```

A few fields are computed by the server, not stored:

- `isOverdue` — task isn't done and its due date is in the past
- `unreadMessagesCount` — the student's messages where `read` is false
- `urgency` — `high` if an open task is overdue and urgent/high, `medium` if there's any open
  urgent/high task (or the student is at-risk with open work), otherwise `low`
- tasks come back sorted: open first, then by priority, then by due date

### `PATCH /tasks/:taskId/status`

```jsonc
// body
{ "status": "in_progress" }   // todo | in_progress | completed
```

Returns the updated task. `400 INVALID_STATUS` for a bad value, `404 TASK_NOT_FOUND` for a bad id.
Changes are saved to Mongo, so they stick around after a restart.

### `POST /reset`

Wipes the collections and re-seeds the original mock data — handy after poking around. Returns
`{ "ok": true, "reseeded": { "students": 3, "tasks": 13, "messages": 8 } }`. There's also a
**Reset data** button in the Students toolbar, and a CLI equivalent: `npm run seed:reset`.

## How it's put together

**Backend is layered:** `routes` deal with HTTP, `services` hold the logic, `models` are the
Mongoose schemas, and `data` has the mock data plus a seed script. The mock data goes in
untouched — the original string IDs are used as `_id` and mapped back to `id` on the way out, so
the response shape matches what the data looked like to begin with.

I put the "thinking" (urgency, overdue, unread count) on the server in `services/actionCenter.ts`
rather than in the UI. They're really business rules, so it felt right to keep them in one place,
and `today`/`now` are passed in so the logic is easy to test. The page also gets one aggregated
endpoint instead of three separate calls — simpler to fetch and render.

**On the frontend** there are two kinds of state. Server data lives in React Query (it handles
loading/error/caching). The status change is an optimistic mutation — the UI updates immediately,
rolls back if the request fails, and refetches on settle so the server's `urgency`/`taskSummary`
stay the source of truth. Plain UI state (which student is selected, the task filter) lives in a
small Zustand store. Styling is Tailwind v4 with the brand tokens defined once in
`styles/index.css`.

There are two routes. `/` is the **Students grid** — a card (or table) list with search and sort,
modelled on Zyra's counselor dashboard. Opening a card navigates to `/students/:studentId`, the
**detail** page for that student: the action center, plus a full-screen chat thread when you open
a message. The student id lives in the URL, so detail pages are deep-linkable, the browser back
button works, and the action-center request only fires once you're actually on a student. A
breadcrumb (and a back button on mobile) returns to the grid.

## Folder structure

### Backend (`server/src`)

```
index.ts            # bootstrap: load env, connect Mongo, seed, mount routes, error handling
db/
  connection.ts     # Mongoose connection setup
models/             # Mongoose schemas — Student, Task, Message
routes/             # HTTP layer (one file per resource)
  students.ts         GET  /students
  actionCenter.ts     GET  /students/:id/action-center
  tasks.ts            PATCH /tasks/:taskId/status
services/
  actionCenter.ts   # the actual logic — aggregation + urgency/overdue/unread
data/
  mockData.ts       # the provided mock data, untouched
  seed.ts           # loads mockData into Mongo if empty
types.ts            # shared domain types
```

I split it by responsibility so each layer has one job: routes only deal with
requests/responses, services hold the logic, models describe the data, and `data` keeps the seed
stuff separate from everything else. The upside is you can change one layer without touching the
others — e.g. swapping the data source later only touches `services`, not the routes. For a
feature this size it's a little more structure than strictly needed, but it keeps the logic out
of the route handlers and makes the derivation easy to find and test.

### Frontend (`client/src`)

```
main.tsx            # entry — mounts Router + React Query provider
App.tsx             # route table: "/" and "/students/:studentId"
pages/
  StudentsPage.tsx       # "/" — the card grid landing
  StudentDetailPage.tsx  # "/students/:id" — action center for one student
api/
  client.ts         # typed fetch wrapper, all endpoints in one place
hooks/              # data hooks — useStudents, useActionCenter, useUpdateTaskStatus, useResetData
store/
  uiStore.ts        # Zustand — just the task filter
components/
  Layout.tsx          # app shell: topbar + routed <Outlet/>
  Topbar.tsx          # route-aware breadcrumb + back button
  StudentsGrid.tsx    # card/table toggle, search, sort
  StudentCard.tsx     # one student card (+ StudentsTable for the table view)
  Avatar.tsx          # photo with initials fallback
  ...                 # profile, tasks, messages, chat, badges, states
styles/
  index.css         # Tailwind entry + theme tokens
utils/
  format.ts         # date / initials / due-date helpers
types.ts            # mirrors the server types
```

Grouped by what things *are* (pages, hooks, components, api). `pages/` are the two routes; the
key idea is keeping data access in `api` + `hooks` so components stay focused on rendering — a
component asks a hook for data and doesn't know or care that there's a fetch behind it. The active
student lives in the URL (`/students/:studentId`), so detail pages are deep-linkable and the
action-center query only loads when you're actually on a student. `types.ts` mirrors the backend
so the contract is typed end to end.

## Performance decisions & tradeoffs

**Single aggregated endpoint.** `GET /students/:id/action-center` returns the complete view
in one round-trip instead of three separate calls (student, tasks, messages). This halves
network latency for the most-used interaction and simplifies frontend data management.

**Parallel DB queries.** Inside that endpoint, tasks and messages are fetched with
`Promise.all` so they run concurrently. On a typical Mongo Atlas cluster this cuts the read
time roughly in half compared to sequential awaits.

**`studentId` indexes on every Task and Message document.** Without these, every
`find({ studentId })` would be a full collection scan. The indexes make those lookups O(log n)
regardless of how many total records exist.

**Server-side derivation, computed once.** `isOverdue`, `urgency`, `taskSummary`, and
`unreadMessagesCount` are all calculated on the server and included in the response. The
client never has to recompute them, and there's one authoritative place for the business rules.

**React Query staleTime + deduplicate.** The student roster has a 5-minute `staleTime` (it
rarely changes). Both queries deduplicate concurrent requests — opening the same student twice
hits the cache, not the network. The task-status mutation is optimistic: the UI flips instantly
and rolls back only on error, so the interaction feels near-zero latency.

**Pino structured logging.** In production, pino writes newline-delimited JSON, which is
~30% faster than `console.log` (buffered async writes, no string formatting). In development,
`pino-pretty` adds colour and human-readable output with no code change needed.

**Lazy avatar images.** Student photos use `loading="lazy"` so only the visible cards load
their images on mount — the full list can render without blocking on off-screen network requests.

**Tradeoffs**

| Decision | Tradeoff |
| --- | --- |
| Mock data in MongoDB | Simple to seed/reset, but not a real production datastore |
| `mongodb-memory-server` for tests | Real Mongo queries, no external service — but adds ~20s on the first CI run to download the binary |
| Pino pretty in dev | Adds a minor startup cost; plain JSON in production avoids it |
| No pagination on `/students` | Fine for 3–10 students; would need cursor-based pagination at scale |

## Testing & CI

### Running the tests locally

```bash
# Backend integration tests (spins up an in-memory MongoDB)
cd server && npm test

# Frontend component tests
cd client && npm test
```

### What's covered

**Backend (`server/src/__tests__/api.test.ts`)** — 6 tests using vitest + supertest +
`mongodb-memory-server`. Real HTTP round-trips, no mocks:
- `GET /students/stu_001/action-center` → 200 with correct student data and an `X-Request-Id` header
- Write→read integration: PATCH a task to completed, then confirm `taskSummary.completed` increased
- 400 with `requestId` for an invalid status value
- 404 with `requestId` for an unknown student
- 404 for an unknown task id
- Deterministic urgency derivation with an injected date (`today = 2026-06-01`)

**Frontend (`client/src/components/__tests__/StudentCard.test.tsx`)** — 3 tests using vitest +
Testing Library + jsdom:
- Renders the student's name, email, enrollment label, open-task count, and next-task title
- Card click fires `onOpen(id)`
- Message button click fires `onMessage(id)` and does **not** fire `onOpen` (verifies `stopPropagation`)

### CI

Every push and pull request triggers the GitHub Actions workflow (`.github/workflows/ci.yml`),
which runs typecheck + tests on the server and client jobs in parallel on Node 20.

## If I had more time

- Real auth so a counselor only sees their own students
- Marking messages read and actual two-way replies
- Expand test coverage: urgency edge cases, chat view rendering, error state components
