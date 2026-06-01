import { Router } from "express";
import { updateTaskStatus } from "../services/actionCenter.js";
import { TASK_STATUSES, type TaskStatus } from "../types.js";
import { errorBody } from "../utils/http.js";

const router = Router();

function isValidStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && TASK_STATUSES.includes(value as TaskStatus);
}

router.patch("/tasks/:taskId/status", async (req, res, next) => {
  try {
    const { status } = req.body ?? {};

    if (!isValidStatus(status)) {
      return res
        .status(400)
        .json(
          errorBody(
            "INVALID_STATUS",
            `"status" must be one of: ${TASK_STATUSES.join(", ")}.`,
            String(req.id),
          ),
        );
    }

    const updated = await updateTaskStatus(req.params.taskId, status);
    if (!updated) {
      return res
        .status(404)
        .json(
          errorBody(
            "TASK_NOT_FOUND",
            `No task found with id "${req.params.taskId}".`,
            String(req.id),
          ),
        );
    }

    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
