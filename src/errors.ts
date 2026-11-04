import type { NextFunction, Request, Response } from "express";
import { MongoServerError } from "mongodb";

export function notFoundHandler(_request: Request, response: Response) {
  response.status(404).json({ message: "Route not found" });
}

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction) {
  const requestId = request.header("cf-ray") ?? crypto.randomUUID();
  console.error("Unhandled API error", { requestId, method: request.method, path: request.path, error });

  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ message: "Request body must contain valid JSON", requestId });
    return;
  }
  if (error instanceof MongoServerError && error.code === 121) {
    response.status(400).json({ message: "Database validation rejected the request", requestId });
    return;
  }
  if (error instanceof Error && error.message.includes("is not configured")) {
    response.status(503).json({ message: "The service is not fully configured", requestId });
    return;
  }
  response.status(500).json({ message: "An unexpected server error occurred", requestId });
}
