import mongoose, { Schema, Document } from "mongoose";

export interface ITimeEntry extends Document {
  user: mongoose.Types.ObjectId;
  workingDuration: number;  // duration in seconds
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workingDuration: { type: Number, required: true },
  },
  { timestamps: true }
);

export const TimeEntry = mongoose.model<ITimeEntry>(
  "TimeEntry",
  TimeEntrySchema
);
