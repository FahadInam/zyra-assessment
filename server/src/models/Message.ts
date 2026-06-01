import { Schema, model } from "mongoose";
import type { Message } from "../types.js";
import { idTransform } from "./schemaOptions.js";

type MessageDoc = Omit<Message, "id"> & { _id: string };

const MessageSchema = new Schema<MessageDoc>(
  {
    _id: { type: String },
    studentId: { type: String, required: true, index: true },
    from: { type: String, required: true },
    subject: { type: String, required: true },
    preview: { type: String, required: true },
    read: { type: Boolean, required: true },
    receivedAt: { type: String, required: true },
  },
  { toJSON: { transform: idTransform } },
);

export const MessageModel = model<MessageDoc>("Message", MessageSchema);
