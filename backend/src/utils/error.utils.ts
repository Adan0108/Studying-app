import { Request, Response, NextFunction } from "express";

export const notFound = (_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ message: "Not Found" });
};

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};
