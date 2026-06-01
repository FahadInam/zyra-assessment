import { Router } from "express";
import { reseed } from "../data/seed.js";

const router = Router();

/** POST /reset — restore the database to the original mock data. */
router.post("/reset", async (_req, res, next) => {
  try {
    const counts = await reseed();
    return res.json({ ok: true, reseeded: counts });
  } catch (err) {
    next(err);
  }
});

export default router;
