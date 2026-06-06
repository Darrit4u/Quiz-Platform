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
        message: "Ошибка проверки данных",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        error: {
          message: "Запись с таким уникальным значением уже существует",
        },
      });
      return;
    }

    if (error.code === "P2025") {
      response.status(404).json({
        error: {
          message: "Запрашиваемая запись не найдена",
        },
      });
      return;
    }
  }

  console.error(error);
  response.status(500).json({
    error: {
      message: "Внутренняя ошибка сервера",
    },
  });
};
