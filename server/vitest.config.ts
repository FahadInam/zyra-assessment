import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // mongodb-memory-server downloads/starts a real mongod the first time —
    // give the suite room to spin it up.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
