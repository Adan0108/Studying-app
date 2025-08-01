import { Router } from "express";
import { addTimeEntry, listTimeHistory } from "../controllers/time.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// All time endpoints require an authenticated user
router.use(protect);

// Record a working session (must be ≥ 120 seconds)
router.post("/", addTimeEntry);

// Get paginated history: ?page=1
router.get("/", listTimeHistory);

export default router;
