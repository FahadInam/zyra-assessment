# Counselor Student Action Center

A full-stack feature built for school counselors. You land on a card grid showing all your students with their urgency level, open task count, and nearest deadline. Click one to open their full action center: profile, tasks you can update inline, unread messages, and a chat view when you open a message. The layout is fully responsive from mobile up to desktop.

**Stack**

Frontend: React, TypeScript, Vite, Tailwind CSS v4, TanStack React Query, Zustand, React Router v6

Backend: Node.js, Express, TypeScript, MongoDB, Mongoose

The design is based on [Zyra's counselor dashboard](https://www.zyra-ai.com/partner/counselors).

## Getting it running

You need Node 18+. The app uses MongoDB for the database — you can get a free one from Atlas in a few minutes.

**Step 1: get a MongoDB connection string**

Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up for free. Create a cluster (pick the free M0 tier), create a database user with a username and password, allow access from anywhere under Network Access (0.0.0.0/0 for development), then hit Connect and copy the connection string. It looks like this:

```
mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Step 2: create your env file**

```bash
cp server/.env.example server/.env
```

Open `server/.env` and replace the placeholder with your connection string. Add the database name before the `?` so it looks like:

```
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/action-center?retryWrites=true&w=majority
PORT=4000
REDIS_URL=redis://localhost:6379
```

The `.env` file is gitignored so it will never be committed or pushed.

**Redis setup (optional but recommended)**

Redis powers two things: roster caching and real-time task updates across browser tabs. The app works fully without it, you just won't get those two features.

The easiest way to get Redis for free with no local install is [Upstash](https://upstash.com). Sign up, create a Redis database, go to the database page, and copy the connection string from the **ioredis** section. It looks like this:

```
rediss://default:yourtoken@your-region.upstash.io:6379
```

Put that as your `REDIS_URL` in `server/.env`. If you prefer to run Redis locally, use Docker:

```bash
docker run -d -p 6379:6379 redis:7
```

Or install it natively from [redis.io/download](https://redis.io/download). The local URL is just `redis://localhost:6379`.

**Step 3: install and run**

```bash
npm run install:all
npm run dev
```

This starts the API on port 4000 and the frontend on port 5173 at the same time. The server seeds the database with the mock data on the first run and skips it on every run after that.

Or if you prefer two separate terminals:

```bash
# Terminal 1
cd server && npm install && npm run dev

# Terminal 2
cd client && npm install && npm run dev
```

The Vite dev proxy forwards `/students`, `/tasks`, and `/reset` to the backend so the browser never has to deal with CORS. There's one small thing worth knowing: because `/students/:id` is both a frontend route and an API prefix, the proxy checks the `Accept` header. A fetch call gets proxied to the API, but if you type `/students/stu_002` directly into the browser URL bar it loads the React page correctly instead of hitting the API.

For production: `npm run build` in either folder, then `npm start` for the server and `npm run preview` for the client.

## API

Base URL: `http://localhost:4000`

### GET /students

Returns the full roster. Each student includes a computed summary so the card grid has something meaningful to show without needing a second request.

```jsonc
[
  {
    "id": "stu_001",
    "name": "Maya Patel",
    "email": "maya.patel@school.edu",
    "grade": 11,
    "gpa": 3.2,
    "counselorId": "csl_001",
    "enrollmentStatus": "at_risk",
    "summary": {
      "openTasks": 4,
      "unreadMessages": 2,
      "urgency": "high",
      "nextTask": {
        "title": "Attendance improvement plan",
        "dueDate": "2026-05-28",
        "isOverdue": true
      }
    }
  }
]
```

### GET /students/:id/action-center

Everything the detail page needs in a single call. Returns 404 with `STUDENT_NOT_FOUND` if the id doesn't exist.

```jsonc
{
  "student": { "id": "stu_001", "name": "Maya Patel", "grade": 11, "gpa": 3.2, "enrollmentStatus": "at_risk" },
  "tasks": [
    {
      "id": "tsk_003",
      "title": "Attendance improvement plan",
      "status": "todo",
      "priority": "urgent",
      "dueDate": "2026-05-28",
      "isOverdue": true
    }
  ],
  "taskSummary": { "total": 5, "todo": 3, "inProgress": 1, "completed": 1, "overdue": 2 },
  "unreadMessagesCount": 2,
  "messages": [ "...newest first" ],
  "urgency": "high"
}
```

The server computes a few fields rather than storing them:

`isOverdue` is true when a task is not completed and its due date is before today. `unreadMessagesCount` is just a count of messages where `read` is false. `urgency` is high when there is an open task that is both overdue and marked urgent or high priority, medium when there are important open tasks but nothing overdue yet (or the student is flagged at-risk with any open work), and low when everything is on track. Tasks are sorted with open ones first, then by priority, then by earliest due date.

### PATCH /tasks/:taskId/status

```json
{ "status": "in_progress" }
```

Accepts `todo`, `in_progress`, or `completed`. Returns 400 with `INVALID_STATUS` for anything else, 404 with `TASK_NOT_FOUND` if the id doesn't exist. Returns the updated task on success. The update writes to MongoDB so it persists across restarts.

### POST /reset

Wipes all three collections and re-inserts the original mock data. Returns `{ "ok": true, "reseeded": { "students": 3, "tasks": 13, "messages": 8 } }`. The same thing is available as a button in the app toolbar and as `npm run seed:reset` in the server folder.

## Architecture

### System overview

```mermaid
graph LR
    Browser["Browser\nReact · React Query · Zustand"]
    API["Express API\nRoutes · Services"]
    MongoDB[("MongoDB\nStudents · Tasks · Messages")]
    Redis[("Redis\nCache · Pub-Sub")]

    Browser -->|HTTP| API
    API -->|read / write| MongoDB
    API -->|cache · events| Redis
    Redis -->|SSE push| Browser
```

### Why this backend structure

The backend follows a layered pattern: routes handle the HTTP stuff, services hold the actual logic, models define the database schemas, and the data folder has the mock data and seeding.

The reason for splitting it this way is that each layer ends up with a single clear job. Routes only care about parsing a request and sending a response. They don't contain any business logic at all. They just call a service function and either send back what it returns or respond with an appropriate error. The service layer is where the real work happens: querying the database, calculating urgency, sorting tasks, building the aggregated response. The models are just schema definitions.

The practical benefit is that you can change one layer without touching anything else. If you need to swap the data source from MongoDB to PostgreSQL, you change the service layer and nothing in the routes needs to know about it. If you want to change how urgency is calculated, you go to `services/actionCenter.ts` and that is the only place.

One specific decision worth explaining is putting all the derivations on the server. Fields like `isOverdue`, `urgency`, and `unreadMessagesCount` are not stored in the database. They get computed fresh on every request. I made that call because they are genuinely business rules, not just presentation logic. If they lived in the frontend then every client would need to implement the same calculation, and if the rule changed you would have to update multiple places. On the server there is one function, one place to change, and the `today` parameter is injected so you can test the logic against any date without touching the system clock.

The action-center endpoint deliberately returns everything for one student in a single aggregated response rather than making the client fetch student, tasks, and messages separately. For a page that needs all three, a single round-trip is just faster and the code on the frontend side is much simpler.

### Why React Query and not plain fetch or Redux

React Query was the right choice here because it handles the three hardest parts of server state: loading states, error states, and cache invalidation. Writing those by hand with `useEffect` and `useState` is repetitive and error-prone. React Query gives you `isLoading`, `isError`, `data`, and `refetch` out of the box, plus automatic deduplication (if two components request the same data at the same time, only one network request fires), configurable stale time, and background refetching.

The task status update is handled as an optimistic mutation, which is the right pattern for a UI like this. When a counselor changes a task status from "to do" to "in progress", the UI flips immediately without waiting for the server. If the server request fails, React Query rolls back to the previous state automatically. When it succeeds, it invalidates the relevant cached query so the server-derived values like `taskSummary` and `urgency` get recalculated from real data. This is much better than either waiting for the server (laggy) or updating the UI and forgetting to sync the server (inconsistent).

Redux would have been significant overkill. The only shared client-side state in this app is the task filter chip selection, which is a single string. Zustand handles that in about 10 lines and costs nothing in bundle size or cognitive overhead.

### Why Redis and what it improves

Without Redis, every call to `GET /students` hits MongoDB, queries all three collections, runs aggregation across all students, and computes summaries from scratch. With 3 students it is fine. With 500 it becomes a noticeable delay, and if multiple counselors are using the app at the same time they are all hitting the database independently for the same data.

Redis sits in front of MongoDB as a cache layer. The first request to `GET /students` runs the full MongoDB query, stores the result in Redis with a 60-second TTL, and returns it. Every subsequent request within that 60 seconds gets the answer directly from Redis in under a millisecond, without touching MongoDB at all. When a task status is updated, the cache key is deleted immediately so the next roster request is always fresh.

The second reason for Redis is real-time updates via Server-Sent Events. When a counselor updates a task, any other counselor viewing that same student on a different tab or device should see the change without refreshing. Without Redis this would only work if both users happened to be connected to the same server process, which is not reliable and breaks entirely when you scale to multiple server instances. With Redis pub-sub, the server publishes an event to a Redis channel when a task changes, and all server instances subscribed to that channel forward it to their connected clients. It works across any number of server instances.

The practical improvement is that the roster grid loads faster on repeat visits, the database gets fewer reads as the app scales, and the action center page reflects live changes automatically when multiple people are working at the same time.

### Folder structure

**Backend (`server/src`)**

```
index.ts              entry point: loads env, connects to MongoDB, seeds if empty, starts listening
app.ts                Express app factory, separate from index.ts so tests can import it cleanly
logger.ts             pino logger configuration
db/
  connection.ts       Mongoose connect function
  lean.ts             helper to convert Mongoose lean docs (_id) to domain types (id)
lib/
  redis.ts            Redis clients (main + subscriber) and connectRedis()
models/               Mongoose schemas for Student, Task, Message
routes/               one file per endpoint group, thin HTTP layer only
  events.ts           GET /events/:studentId — SSE endpoint for real-time updates
services/
  actionCenter.ts     all the actual logic: aggregation, urgency, sorting, task updates, cache
data/
  mockData.ts         the original mock data, completely unchanged
  seed.ts             idempotent seed + reseed functions
types.ts              all domain types and allowed-value arrays in one place
utils/
  http.ts             shared errorBody() builder so all error responses have the same shape
```

**Frontend (`client/src`)**

```
main.tsx              entry: BrowserRouter + QueryClientProvider
App.tsx               route definitions
pages/
  StudentsPage.tsx    the "/" route: card grid
  StudentDetailPage.tsx  "/students/:id": action center for one student
api/
  client.ts           typed fetch wrapper, every endpoint defined once
hooks/                data hooks: useStudents, useActionCenter, useUpdateTaskStatus, useResetData, useSSE
store/
  uiStore.ts          Zustand: task filter only (active student lives in the URL, not here)
components/           one component per piece of UI
styles/
  index.css           Tailwind entry point + all design tokens
utils/
  format.ts           date formatting, initials, avatar gradients
types.ts              mirrors the server types exactly
```

The frontend is grouped by what things are rather than by feature. The key principle is that data access stays in `api/` and `hooks/` so components are purely about rendering. A component calls a hook, gets data back, and renders it. It has no idea there is a fetch happening. This also means components are straightforward to test in isolation.

## If I had more time

Real authentication so each counselor only sees their own students. Marking messages as read when you open them. Actual two-way replies instead of a read-only chat view. More test coverage on the urgency derivation edge cases.
