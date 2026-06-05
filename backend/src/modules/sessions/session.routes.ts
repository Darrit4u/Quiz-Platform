import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as sessionController from "./session.controller.js";

export const quizSessionRouter = Router();
export const sessionRouter = Router();

quizSessionRouter.use(authMiddleware);
quizSessionRouter.post(
  "/:quizId/sessions",
  requireRole("ORGANIZER"),
  sessionController.createSession,
);

sessionRouter.use(authMiddleware);

sessionRouter.get(
  "/hosted",
  requireRole("ORGANIZER"),
  sessionController.getHostedSessions,
);
sessionRouter.get(
  "/participated",
  requireRole("PARTICIPANT"),
  sessionController.getParticipatedSessions,
);
sessionRouter.get("/code/:roomCode", sessionController.getSessionByCode);
sessionRouter.post(
  "/code/:roomCode/join",
  requireRole("PARTICIPANT"),
  sessionController.joinSession,
);
sessionRouter.post(
  "/:sessionId/start",
  requireRole("ORGANIZER"),
  sessionController.startSession,
);
sessionRouter.post(
  "/:sessionId/questions/close",
  requireRole("ORGANIZER"),
  sessionController.closeQuestion,
);
sessionRouter.post(
  "/:sessionId/questions/show-answer",
  requireRole("ORGANIZER"),
  sessionController.showAnswer,
);
sessionRouter.post(
  "/:sessionId/questions/next",
  requireRole("ORGANIZER"),
  sessionController.nextQuestion,
);
sessionRouter.post(
  "/:sessionId/finish",
  requireRole("ORGANIZER"),
  sessionController.finishSession,
);
sessionRouter.post(
  "/:sessionId/cancel",
  requireRole("ORGANIZER"),
  sessionController.cancelSession,
);
sessionRouter.post(
  "/:sessionId/answers",
  requireRole("PARTICIPANT"),
  sessionController.submitAnswer,
);
sessionRouter.get("/:sessionId/results", sessionController.getResults);
sessionRouter.get("/:sessionId", sessionController.getSession);
