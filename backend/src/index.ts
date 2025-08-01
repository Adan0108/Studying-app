import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.config";
import authRoutes from "./routes/auth.routes";
import todoRoutes from "./routes/todo.routes";
import timeRoutes from "./routes/time.routes";
import { notFound, errorHandler } from "./utils/error.utils";

const app = express();

// DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/time", timeRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
