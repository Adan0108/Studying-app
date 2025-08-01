import { Todo, ITodo } from "../models/todo.model";
import mongoose from "mongoose";

const PAGE_SIZE = 10;

export interface PaginatedTodos {
  todos: ITodo[];
  total: number;
  page: number;
  pages: number;
}

export async function getIncompleteTodos(userId: string): Promise<ITodo[]> {
  return Todo.find({ user: userId, completed: false })
    .sort({ createdAt: -1 })
    .exec();
}

export async function getTodosPaginated(
  userId: string,
  page: number = 1
): Promise<PaginatedTodos> {
  const filter = { user: userId };
  const total = await Todo.countDocuments(filter).exec();
  const pages = Math.ceil(total / PAGE_SIZE);
  const todos = await Todo.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .exec();

  return { todos, total, page, pages };
}

export async function createTodo(
  userId: string,
  title: string
): Promise<ITodo> {
  const todo = new Todo({
    user: new mongoose.Types.ObjectId(userId),
    title,
  });
  return todo.save();
}

// Reused for both updates
export async function updateTodo(
  userId: string,
  todoId: string,
  updates: Partial<Pick<ITodo, "title" | "completed">>
): Promise<ITodo | null> {
  return Todo.findOneAndUpdate(
    { _id: todoId, user: userId },
    { $set: updates },
    { new: true }
  ).exec();
}

export async function deleteTodo(
  userId: string,
  todoId: string
): Promise<void> {
  await Todo.findOneAndDelete({ _id: todoId, user: userId }).exec();
}
