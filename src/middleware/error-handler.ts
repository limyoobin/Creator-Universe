import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: error.flatten(),
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error."
      : error instanceof Error
        ? error.message
        : "Internal server error.";

  return res.status(500).json({
    success: false,
    message,
  });
}
