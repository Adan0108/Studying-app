import { Request, Response } from "express";
import {
  createTimeEntry,
  getTimeHistoryPaginated,
} from "../services/time.service";

interface AuthedRequest extends Request {
  user?: { id: string };
}

export async function addTimeEntry(req: AuthedRequest, res: Response) {
  const { workingDuration } = req.body;
  if (
    typeof workingDuration !== "number" ||
    workingDuration < 120  // enforce minimum of 120 seconds
  ) {
    return res.status(400).json({
      message: "workingDuration (seconds) is required and must be at least 120",
    });
  }
  try {
    const entry = await createTimeEntry(req.user!.id, workingDuration);
    return res.status(201).json(entry);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

export async function listTimeHistory(req: AuthedRequest, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const result = await getTimeHistoryPaginated(req.user!.id, page);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
