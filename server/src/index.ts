import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { connectDB } from "./db/connection.js";
import { seedIfEmpty } from "./data/seed.js";
import actionCenterRoutes from "./routes/actionCenter.js";
import adminRoutes from "./routes/admin.js";
import studentRoutes from "./routes/students.js";
import taskRoutes from "./routes/tasks.js";
import { errorBody } from "./utils/http.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to server/.env and restart.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(studentRoutes);
app.use(actionCenterRoutes);
app.use(taskRoutes);
app.use(adminRoutes);

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
  app.listen(PORT, () => {
    console.log(`Action Center API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
