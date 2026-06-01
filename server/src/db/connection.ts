import mongoose from "mongoose";

export async function connectDB(uri: string): Promise<void> {
  mongoose.connection.on("connected", () =>
    console.log("MongoDB connected:", mongoose.connection.name),
  );
  mongoose.connection.on("error", (err) =>
    console.error("MongoDB error:", err),
  );
  await mongoose.connect(uri);
}
