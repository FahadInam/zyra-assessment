import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { connectDB } from "./db/connection.js";
import { seedIfEmpty } from "./data/seed.js";
import { connectRedis } from "./lib/redis.js";
import actionCenterRoutes from "./routes/actionCenter.js";
import adminRoutes from "./routes/admin.js";
import eventsRoutes from "./routes/events.js";
import studentRoutes from "./routes/students.js";
import taskRoutes from "./routes/tasks.js";
import { errorBody } from "./utils/http.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

// Allowed origins: the deployed Amplify frontend + local dev.
// Add ALLOWED_ORIGIN to server/.env to override (e.g. a custom domain).
const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN,
  "https://main.d25fi4uc6c5s2h.amplifyapp.com",
  "http://localhost:5173",
].filter(Boolean) as string[];

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to server/.env and restart.");
  process.exit(1);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(studentRoutes);
app.use(actionCenterRoutes);
app.use(taskRoutes);
app.use(adminRoutes);
app.use(eventsRoutes);

app.use((_req, res) => {
  res.status(404).json(errorBody("NOT_FOUND", "Route not found."));
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json(errorBody("INVALID_JSON", "Request body is not valid JSON."));
  }
  console.error("Unhandled error:", err);
  return res.status(500).json(errorBody("INTERNAL_ERROR", "Something went wrong."));
});

async function start() {
  await connectDB(MONGODB_URI!);
  await seedIfEmpty();
  await connectRedis(); // optional — app works without Redis
  app.listen(PORT, () => {
    console.log(`Action Center API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
