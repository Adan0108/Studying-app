import { Router } from "express";
import {
  listIncompleteTodos,
  listAllTodos,
  addTodo,
  editTodoTitle,
  markTodoComplete,
  removeTodo,
  markTodoIncomplete
} from "../controllers/todo.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();
router.use(protect);

router.get("/incomplete", listIncompleteTodos);
router.get("/", listAllTodos);

router.post("/", addTodo);
router.patch("/:id/title", editTodoTitle);      // PATCH /api/todos/:id/title
router.patch("/:id/complete", markTodoComplete); // PATCH /api/todos/:id/complete
router.delete("/:id", removeTodo);
router.patch("/:id/incomplete", markTodoIncomplete);

export default router;
