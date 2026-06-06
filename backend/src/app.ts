import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { quizRouter } from "./modules/quizzes/quiz.routes.js";
import {
  quizSessionRouter,
  sessionRouter,
} from "./modules/sessions/session.routes.js";
import { HttpError } from "./utils/httpError.js";

export const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({
      status: "ok",
      service: "realtime-quiz-backend",
      database: "ok",
    });
  } catch {
    response.status(503).json({
      status: "error",
      service: "realtime-quiz-backend",
      database: "unavailable",
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/quizzes", quizSessionRouter);
app.use("/api/quizzes", quizRouter);
app.use("/api/sessions", sessionRouter);

app.use((request, _response, next) => {
  next(new HttpError(404, `Маршрут ${request.method} ${request.path} не найден`));
});

app.use(errorMiddleware);
