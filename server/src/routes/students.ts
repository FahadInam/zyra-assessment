import { Router } from "express";
import { getStudentRoster } from "../services/actionCenter.js";

const router = Router();

/** GET /students — roster with a compact per-student summary (for the card grid). */
router.get("/students", async (_req, res, next) => {
  try {
    const roster = await getStudentRoster();
    return res.json(roster);
  } catch (err) {
    next(err);
  }
});

export default router;
