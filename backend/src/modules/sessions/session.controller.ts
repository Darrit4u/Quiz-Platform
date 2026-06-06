import type { Request, Response } from "express";
import { HttpError } from "../../utils/httpError.js";
import {
  joinSessionSchema,
  quizSessionParamsSchema,
  roomCodeParamsSchema,
  sessionParamsSchema,
  submitAnswerSchema,
} from "./session.schemas.js";
import * as sessionService from "./session.service.js";

function getAuthUser(request: Request) {
  if (!request.user) {
    throw new HttpError(401, "Требуется авторизация");
  }

  return request.user;
}

export async function createSession(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { quizId } = quizSessionParamsSchema.parse(request.params);
  const session = await sessionService.createSession(user.id, quizId);
  response.status(201).json({ session });
}

export async function getSession(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { sessionId } = sessionParamsSchema.parse(request.params);
  const session = await sessionService.getSession(user, sessionId);
  response.json({ session });
}

export async function getSessionByCode(
  request: Request,
  response: Response,
) {
  getAuthUser(request);
  const { roomCode } = roomCodeParamsSchema.parse(request.params);
  const session = await sessionService.getSessionByCode(roomCode);
  response.json({ session });
}

export async function joinSession(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { roomCode } = roomCodeParamsSchema.parse(request.params);
  const input = joinSessionSchema.parse(request.body);
  const result = await sessionService.joinSession(user.id, roomCode, input);
  response.status(201).json(result);
}

export async function startSession(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { sessionId } = sessionParamsSchema.parse(request.params);
  const session = await sessionService.startSession(user.id, sessionId);
  response.json({ session });
}

export async function closeQuestion(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { sessionId } = sessionParamsSchema.parse(request.params);
  const session = await sessionService.closeQuestion(user.id, sessionId);
  response.json({ session });
}

export async function showAnswer(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { sessionId } = sessionParamsSchema.parse(request.params);
  const session = await sessionService.showAnswer(user.id, sessionId);
  response.json({ session });
}

export async function nextQuestion(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { sessionId } = sessionParamsSchema.parse(request.params);
  const result = await sessionService.nextQuestion(user.id, sessionId);
  response.json(result);
}

export async function finishSession(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { sessionId } = sessionParamsSchema.parse(request.params);
  const result = await sessionService.finishSession(user.id, sessionId);
  response.json(result);
}

export async function cancelSession(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { sessionId } = sessionParamsSchema.parse(request.params);
  const session = await sessionService.cancelSession(user.id, sessionId);
  response.json({ session });
}

export async function submitAnswer(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { sessionId } = sessionParamsSchema.parse(request.params);
  const input = submitAnswerSchema.parse(request.body);
  const result = await sessionService.submitAnswer(
    user.id,
    sessionId,
    input,
  );
  response.status(201).json(result);
}

export async function getResults(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { sessionId } = sessionParamsSchema.parse(request.params);
  const result = await sessionService.getResults(user, sessionId);
  response.json(result);
}

export async function getHostedSessions(
  request: Request,
  response: Response,
) {
  const user = getAuthUser(request);
  const sessions = await sessionService.getHostedSessions(user.id);
  response.json({ sessions });
}

export async function getParticipatedSessions(
  request: Request,
  response: Response,
) {
  const user = getAuthUser(request);
  const sessions = await sessionService.getParticipatedSessions(user.id);
  response.json({ sessions });
}
