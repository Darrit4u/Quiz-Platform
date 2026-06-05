import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as quizController from "./quiz.controller.js";

export const quizRouter = Router();

quizRouter.use(authMiddleware);

quizRouter.get("/", quizController.listQuizzes);
quizRouter.post(
  "/",
  requireRole("ORGANIZER"),
  quizController.createQuiz,
);
quizRouter.get("/:quizId", quizController.getQuiz);
quizRouter.patch(
  "/:quizId",
  requireRole("ORGANIZER"),
  quizController.updateQuiz,
);
quizRouter.delete(
  "/:quizId",
  requireRole("ORGANIZER"),
  quizController.deleteQuiz,
);
quizRouter.post(
  "/:quizId/questions",
  requireRole("ORGANIZER"),
  quizController.createQuestion,
);
quizRouter.patch(
  "/:quizId/questions/:questionId",
  requireRole("ORGANIZER"),
  quizController.updateQuestion,
);
quizRouter.delete(
  "/:quizId/questions/:questionId",
  requireRole("ORGANIZER"),
  quizController.deleteQuestion,
);
