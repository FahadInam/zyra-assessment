import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { reseed } from "../data/seed.js";
import { connectDB } from "../db/connection.js";
import { getActionCenter } from "../services/actionCenter.js";

// Real Express app + a real (in-memory) MongoDB. This is a true integration
// test: it exercises routes → services → Mongoose → MongoDB end to end, with
// no mocks, and resets to the original mock data before the assertions run.
const app = createApp();
let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
  await reseed();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("GET /students/:id/action-center", () => {
  it("returns the aggregated payload for a known student", async () => {
    const res = await request(app).get("/students/stu_001/action-center");

    expect(res.status).toBe(200);
    expect(res.body.student.name).toBe("Maya Patel");
    expect(res.body.unreadMessagesCount).toBe(2);
    expect(res.body.taskSummary.total).toBe(5);
    // every response carries a correlation id
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("404s with a request id for an unknown student", async () => {
    const res = await request(app).get("/students/does_not_exist/action-center");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("STUDENT_NOT_FOUND");
    expect(res.body.requestId).toBeTruthy();
  });
});

describe("PATCH /tasks/:taskId/status", () => {
  it("updates a task and the change is reflected on the next read", async () => {
    // baseline
    const before = await request(app).get("/students/stu_001/action-center");
    const completedBefore = before.body.taskSummary.completed;

    // mark an open task complete
    const patch = await request(app)
      .patch("/tasks/tsk_001/status")
      .send({ status: "completed" });

    expect(patch.status).toBe(200);
    expect(patch.body.status).toBe("completed");

    // read again — the summary should reflect the write
    const after = await request(app).get("/students/stu_001/action-center");
    expect(after.body.taskSummary.completed).toBe(completedBefore + 1);
  });

  it("rejects an invalid status with 400 + request id", async () => {
    const res = await request(app)
      .patch("/tasks/tsk_002/status")
      .send({ status: "not_a_real_status" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_STATUS");
    expect(res.body.requestId).toBeTruthy();
  });

  it("404s for an unknown task id", async () => {
    const res = await request(app)
      .patch("/tasks/tsk_999/status")
      .send({ status: "todo" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("TASK_NOT_FOUND");
  });
});

describe("urgency derivation (deterministic, injected date)", () => {
  it("flags an at-risk student with overdue urgent work as high urgency", async () => {
    // Reset first so the earlier PATCH test doesn't affect this assertion.
    await reseed();
    // Pass a fixed 'today' so the overdue check doesn't depend on the real clock.
    const result = await getActionCenter("stu_001", new Date("2026-06-01T00:00:00Z"));
    expect(result?.urgency).toBe("high");
  });
});
