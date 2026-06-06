import type { Request, Response } from "express";
import { HttpError } from "../../utils/httpError.js";
import {
  createQuestionSchema,
  createQuizSchema,
  questionIdParamsSchema,
  quizIdParamsSchema,
  updateQuestionSchema,
  updateQuizSchema,
} from "./quiz.schemas.js";
import * as quizService from "./quiz.service.js";

function getAuthUser(request: Request) {
  if (!request.user) {
    throw new HttpError(401, "Требуется авторизация");
  }
  return request.user;
}

export async function listQuizzes(request: Request, response: Response) {
  const quizzes = await quizService.listQuizzes(getAuthUser(request));
  response.json({ quizzes });
}

export async function createQuiz(request: Request, response: Response) {
  const user = getAuthUser(request);
  const input = createQuizSchema.parse(request.body);
  const quiz = await quizService.createQuiz(user.id, input);
  response.status(201).json({ quiz });
}

export async function getQuiz(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { quizId } = quizIdParamsSchema.parse(request.params);
  const quiz = await quizService.getQuiz(user, quizId);
  response.json({ quiz });
}

export async function updateQuiz(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { quizId } = quizIdParamsSchema.parse(request.params);
  const input = updateQuizSchema.parse(request.body);
  const quiz = await quizService.updateQuiz(user.id, quizId, input);
  response.json({ quiz });
}

export async function deleteQuiz(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { quizId } = quizIdParamsSchema.parse(request.params);
  await quizService.deleteQuiz(user.id, quizId);
  response.status(204).send();
}

export async function createQuestion(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { quizId } = quizIdParamsSchema.parse(request.params);
  const input = createQuestionSchema.parse(request.body);
  const question = await quizService.createQuestion(user.id, quizId, input);
  response.status(201).json({ question });
}

export async function updateQuestion(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { quizId, questionId } = questionIdParamsSchema.parse(request.params);
  const input = updateQuestionSchema.parse(request.body);
  const question = await quizService.updateQuestion(
    user.id,
    quizId,
    questionId,
    input,
  );
  response.json({ question });
}

export async function deleteQuestion(request: Request, response: Response) {
  const user = getAuthUser(request);
  const { quizId, questionId } = questionIdParamsSchema.parse(request.params);
  await quizService.deleteQuestion(user.id, quizId, questionId);
  response.status(204).send();
}
