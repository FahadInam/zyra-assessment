import { Router } from "express";
import { getActionCenter } from "../services/actionCenter.js";
import { errorBody } from "../utils/http.js";

const router = Router();

router.get("/students/:id/action-center", async (req, res, next) => {
  try {
    const result = await getActionCenter(req.params.id);
    if (!result) {
      return res
        .status(404)
        .json(
          errorBody(
            "STUDENT_NOT_FOUND",
            `No student found with id "${req.params.id}".`,
            String(req.id),
          ),
        );
    }
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
