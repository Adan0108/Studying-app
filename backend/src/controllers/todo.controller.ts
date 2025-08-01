import { Request, Response } from "express";
import {
  getIncompleteTodos,
  getTodosPaginated,
  createTodo,
  updateTodo,
  deleteTodo,
  PaginatedTodos,
} from "../services/todo.service";

interface AuthedRequest extends Request {
  user?: { id: string };
}

export async function listIncompleteTodos(
  req: AuthedRequest,
  res: Response
) {
  try {
    const todos = await getIncompleteTodos(req.user!.id);
    return res.json(todos);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

export async function listAllTodos(
  req: AuthedRequest,
  res: Response
) {
  try {
    // use req.query.page; if undefined or invalid, defaults to 1
    const page = Number(req.query.page) || 1;
    const result: PaginatedTodos = await getTodosPaginated(
      req.user!.id,
      page
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

export async function addTodo(req: AuthedRequest, res: Response) {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }
  try {
    const todo = await createTodo(req.user!.id, title);
    return res.status(201).json(todo);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

// 1) Edit title only
export async function editTodoTitle(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const { title } = req.body;
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ message: "Valid title is required" });
  }
  try {
    const updated = await updateTodo(req.user!.id, id, { title });
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

// 2) Mark complete only
export async function markTodoComplete(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  try {
    const updated = await updateTodo(req.user!.id, id, { completed: true });
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

export async function removeTodo(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  try {
    await deleteTodo(req.user!.id, id);
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
