import { httpClient } from "@/api/httpClient";
import type {
  CreateQuizInput,
  Question,
  QuestionInput,
  Quiz,
  UpdateQuizInput,
} from "@/types/quiz";

export async function getQuizzes() {
  const response = await httpClient<{ quizzes: Quiz[] }>("/quizzes");
  return response.quizzes;
}

export async function createQuiz(input: CreateQuizInput) {
  const response = await httpClient<{ quiz: Quiz }>("/quizzes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.quiz;
}

export async function getQuiz(quizId: string) {
  const response = await httpClient<{ quiz: Quiz }>(`/quizzes/${quizId}`);
  return response.quiz;
}

export async function updateQuiz(quizId: string, input: UpdateQuizInput) {
  const response = await httpClient<{ quiz: Quiz }>(`/quizzes/${quizId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.quiz;
}

export async function createQuestion(
  quizId: string,
  input: QuestionInput,
) {
  const response = await httpClient<{ question: Question }>(
    `/quizzes/${quizId}/questions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return response.question;
}

export async function updateQuestion(
  quizId: string,
  questionId: string,
  input: QuestionInput,
) {
  const response = await httpClient<{ question: Question }>(
    `/quizzes/${quizId}/questions/${questionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return response.question;
}
