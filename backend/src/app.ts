import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
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

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "realtime-quiz-backend",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/quizzes", quizSessionRouter);
app.use("/api/quizzes", quizRouter);
app.use("/api/sessions", sessionRouter);

app.use((request, _response, next) => {
  next(new HttpError(404, `Route ${request.method} ${request.path} not found`));
});

app.use(errorMiddleware);
