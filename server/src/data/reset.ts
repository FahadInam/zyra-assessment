// Standalone script: restore the database to the original mock data.
// Run with: npm run seed:reset
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../db/connection.js";
import { reseed } from "./seed.js";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to server/.env and retry.");
    process.exit(1);
  }
  await connectDB(uri);
  const counts = await reseed();
  console.log(
    `Reset complete: ${counts.students} students, ${counts.tasks} tasks, ${counts.messages} messages.`,
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
