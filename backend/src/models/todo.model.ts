import mongoose, { Schema, Document } from "mongoose";

export interface ITodo extends Document {
  user: mongoose.Types.ObjectId;   // owner
  title: string;
  completed: boolean;
}

const TodoSchema = new Schema<ITodo>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Todo = mongoose.model<ITodo>("Todo", TodoSchema);
