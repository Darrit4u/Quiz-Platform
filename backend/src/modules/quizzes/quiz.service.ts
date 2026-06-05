import { Prisma, type QuestionType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import type { AuthUser } from "../users/user.types.js";
import {
  questionIntegritySchema,
  type CreateQuestionInput,
  type CreateQuizInput,
  type UpdateQuestionInput,
  type UpdateQuizInput,
} from "./quiz.schemas.js";

const questionInclude = {
  answerOptions: {
    orderBy: {
      orderIndex: Prisma.SortOrder.asc,
    },
  },
} as const;

const quizDetailsInclude = {
  category: true,
  questions: {
    orderBy: {
      orderIndex: Prisma.SortOrder.asc,
    },
    include: questionInclude,
  },
} as const;

async function requireOwnedQuiz(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      creatorId: true,
      _count: {
        select: { sessions: true },
      },
    },
  });

  if (!quiz) {
    throw new HttpError(404, "Quiz not found");
  }

  if (quiz.creatorId !== userId) {
    throw new HttpError(403, "You can only manage your own quizzes");
  }

  return quiz;
}

async function requireOwnedQuestion(
  userId: string,
  quizId: string,
  questionId: string,
) {
  await requireOwnedQuiz(userId, quizId);

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      quizId,
    },
    include: {
      ...questionInclude,
      _count: {
        select: { participantAnswers: true },
      },
    },
  });

  if (!question) {
    throw new HttpError(404, "Question not found");
  }

  return question;
}

export async function listQuizzes(user: AuthUser) {
  const quizzes = await prisma.quiz.findMany({
    where:
      user.role === "ORGANIZER" || user.role === "ADMIN"
        ? user.role === "ADMIN"
          ? undefined
          : { creatorId: user.id }
        : {
            status: "PUBLISHED",
            visibility: "PUBLIC",
          },
    orderBy: { updatedAt: "desc" },
    include: {
      category: true,
      _count: {
        select: {
          questions: true,
          sessions: true,
        },
      },
    },
  });

  return quizzes.map(({ _count, ...quiz }) => ({
    ...quiz,
    questionCount: _count.questions,
    sessionCount: _count.sessions,
  }));
}

export async function createQuiz(userId: string, input: CreateQuizInput) {
  const { categoryId, ...quizData } = input;

  return prisma.quiz.create({
    data: {
      ...quizData,
      creator: {
        connect: { id: userId },
      },
      category:
        categoryId === undefined || categoryId === null
          ? undefined
          : { connect: { id: categoryId } },
    },
    include: { category: true },
  });
}

export async function getQuiz(user: AuthUser, quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: quizDetailsInclude,
  });

  if (!quiz) {
    throw new HttpError(404, "Quiz not found");
  }

  if (
    user.role !== "ADMIN" &&
    (user.role !== "ORGANIZER" || quiz.creatorId !== user.id)
  ) {
    throw new HttpError(403, "You do not have access to this quiz");
  }

  return quiz;
}

export async function updateQuiz(
  userId: string,
  quizId: string,
  input: UpdateQuizInput,
) {
  await requireOwnedQuiz(userId, quizId);
  const { categoryId, ...quizData } = input;

  return prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...quizData,
      category:
        categoryId === undefined
          ? undefined
          : categoryId === null
            ? { disconnect: true }
            : { connect: { id: categoryId } },
    },
    include: { category: true },
  });
}

export async function deleteQuiz(userId: string, quizId: string) {
  const quiz = await requireOwnedQuiz(userId, quizId);

  if (quiz._count.sessions > 0) {
    throw new HttpError(
      409,
      "A quiz with session history cannot be deleted; archive it instead",
    );
  }

  await prisma.quiz.delete({ where: { id: quizId } });
}

export async function createQuestion(
  userId: string,
  quizId: string,
  input: CreateQuestionInput,
) {
  await requireOwnedQuiz(userId, quizId);

  const { options, ...questionData } = input;
  return prisma.question.create({
    data: {
      ...questionData,
      quizId,
      answerOptions: {
        create: options,
      },
    },
    include: questionInclude,
  });
}

export async function updateQuestion(
  userId: string,
  quizId: string,
  questionId: string,
  input: UpdateQuestionInput,
) {
  const currentQuestion = await requireOwnedQuestion(
    userId,
    quizId,
    questionId,
  );
  const nextType: QuestionType = input.type ?? currentQuestion.type;
  const nextOptions =
    input.options ??
    currentQuestion.answerOptions.map(
      ({ text, imageUrl, isCorrect, orderIndex }) => ({
        text,
        imageUrl,
        isCorrect,
        orderIndex,
      }),
    );

  questionIntegritySchema.parse({
    type: nextType,
    options: nextOptions,
  });

  const { options, ...questionData } = input;
  const updateData: Prisma.QuestionUpdateInput = {
    ...questionData,
  };

  if (options) {
    updateData.answerOptions = {
      deleteMany: {},
      create: options,
    };
  }

  return prisma.question.update({
    where: { id: questionId },
    data: updateData,
    include: questionInclude,
  });
}

export async function deleteQuestion(
  userId: string,
  quizId: string,
  questionId: string,
) {
  const question = await requireOwnedQuestion(userId, quizId, questionId);

  if (question._count.participantAnswers > 0) {
    throw new HttpError(
      409,
      "A question with participant answers cannot be deleted",
    );
  }

  await prisma.question.delete({ where: { id: questionId } });
}
