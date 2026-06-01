import "dotenv/config";
import { createApp } from "./app.js";
import { seedIfEmpty } from "./data/seed.js";
import { connectDB } from "./db/connection.js";
import { logger } from "./logger.js";

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  logger.error("MONGODB_URI is not set. Add it to server/.env and restart.");
  process.exit(1);
}

async function start() {
  await connectDB(MONGODB_URI!);
  await seedIfEmpty();

  const app = createApp();
  app.listen(PORT, () => {
    logger.info(`Action Center API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
