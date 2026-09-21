import { Response } from "express";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function sendError(res: Response, error: unknown): void {
  if (error instanceof ApiError) {
    res.status(error.status).json({ success: false, error: { message: error.message } });
    return;
  }

  console.error(error);
  res.status(500).json({ success: false, error: { message: "Internal server error" } });
}
