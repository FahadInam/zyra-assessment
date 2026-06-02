import { Router } from "express";
import { reseed } from "../data/seed.js";
import { redis } from "../lib/redis.js";

const router = Router();

/** POST /reset — restore the database to the original mock data. */
router.post("/reset", async (_req, res, next) => {
  try {
    const counts = await reseed();
    // Clear the Redis roster cache so the grid reflects fresh data immediately.
    redis.del("roster").catch(() => {});
    return res.json({ ok: true, reseeded: counts });
  } catch (err) {
    next(err);
  }
});

export default router;
