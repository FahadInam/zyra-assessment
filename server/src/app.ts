import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import { logger } from "./logger.js";
import actionCenterRoutes from "./routes/actionCenter.js";
import adminRoutes from "./routes/admin.js";
import logsRoutes from "./routes/logs.js";
import studentRoutes from "./routes/students.js";
import taskRoutes from "./routes/tasks.js";
import { errorBody } from "./utils/http.js";

/**
 * Builds the Express app with all middleware and routes wired up.
 * Kept separate from index.ts (which connects the DB and calls listen) so the
 * integration tests can import a ready-to-use app without starting a server.
 */
export function createApp() {
  const app = express();

  // 1. Request logging + a request id on every request.
  //    Reuse an incoming X-Request-Id (e.g. from a gateway) or generate one,
  //    expose it on the response header, and attach it to each log line.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
      },
    }),
  );

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use(studentRoutes);
  app.use(actionCenterRoutes);
  app.use(taskRoutes);
  app.use(adminRoutes);
  app.use(logsRoutes);

  // Unknown route → 404 (carries the request id so the client can report it).
  app.use((req: Request, res: Response) => {
    res.status(404).json(errorBody("NOT_FOUND", "Route not found.", String(req.id)));
  });

  // Central error handler. Four args = Express treats it as the error handler.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    // req.log is the per-request child logger (already bound to the request id).
    req.log.error({ err }, "request failed");

    if (err instanceof SyntaxError && "body" in err) {
      return res
        .status(400)
        .json(errorBody("INVALID_JSON", "Request body is not valid JSON.", String(req.id)));
    }
    return res
      .status(500)
      .json(errorBody("INTERNAL_ERROR", "Something went wrong.", String(req.id)));
  });

  return app;
}
