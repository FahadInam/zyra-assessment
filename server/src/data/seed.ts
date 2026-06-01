import { MessageModel } from "../models/Message.js";
import { StudentModel } from "../models/Student.js";
import { TaskModel } from "../models/Task.js";
import { messages, students, tasks } from "./mockData.js";

/** Wipe the collections and re-insert the original mock data. */
export async function reseed(): Promise<{
  students: number;
  tasks: number;
  messages: number;
}> {
  await Promise.all([
    StudentModel.deleteMany({}),
    TaskModel.deleteMany({}),
    MessageModel.deleteMany({}),
  ]);

  const studentDocs = students.map((s) => ({ _id: s.id, ...s }));
  const taskDocs = tasks.map((t) => ({ _id: t.id, ...t }));
  const messageDocs = messages.map((m) => ({ _id: m.id, ...m }));

  await Promise.all([
    StudentModel.insertMany(studentDocs),
    TaskModel.insertMany(taskDocs),
    MessageModel.insertMany(messageDocs),
  ]);

  return {
    students: studentDocs.length,
    tasks: taskDocs.length,
    messages: messageDocs.length,
  };
}

/**
 * Seeds the database with the mock data if the collections are empty.
 * Safe to call on every startup — it's a no-op when data already exists.
 */
export async function seedIfEmpty(): Promise<void> {
  const count = await StudentModel.countDocuments();
  if (count > 0) {
    console.log("Database already seeded — skipping.");
    return;
  }

  const counts = await reseed();
  console.log(
    `Seeded: ${counts.students} students, ${counts.tasks} tasks, ${counts.messages} messages.`,
  );
}
