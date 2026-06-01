import { Schema, model } from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES, type Task } from "../types.js";
import { idTransform } from "./schemaOptions.js";

type TaskDoc = Omit<Task, "id"> & { _id: string };

const TaskSchema = new Schema<TaskDoc>(
  {
    _id: { type: String },
    studentId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: [...TASK_STATUSES],
      required: true,
    },
    priority: {
      type: String,
      enum: [...TASK_PRIORITIES],
      required: true,
    },
    dueDate: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { toJSON: { transform: idTransform } },
);

export const TaskModel = model<TaskDoc>("Task", TaskSchema);
