import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: {
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        message: "Validation failed",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        error: {
          message: "A record with this unique value already exists",
        },
      });
      return;
    }

    if (error.code === "P2025") {
      response.status(404).json({
        error: {
          message: "Requested record was not found",
        },
      });
      return;
    }
  }

  console.error(error);
  response.status(500).json({
    error: {
      message: "Internal server error",
    },
  });
};
