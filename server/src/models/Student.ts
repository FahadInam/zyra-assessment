import { Schema, model } from "mongoose";
import { ENROLLMENT_STATUSES, type Student } from "../types.js";
import { idTransform } from "./schemaOptions.js";

type StudentDoc = Omit<Student, "id"> & { _id: string };

const StudentSchema = new Schema<StudentDoc>(
  {
    _id: { type: String },
    name: { type: String, required: true },
    email: { type: String, required: true },
    grade: { type: Number, required: true },
    gpa: { type: Number, required: true },
    counselorId: { type: String, required: true },
    enrollmentStatus: {
      type: String,
      enum: [...ENROLLMENT_STATUSES],
      required: true,
    },
  },
  { toJSON: { transform: idTransform } },
);

export const StudentModel = model<StudentDoc>("Student", StudentSchema);
