import {
  Prisma,
  type QuestionType,
  type QuizStatus,
} from "@prisma/client";
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
      status: true,
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

function getPublishValidationErrors(
  questions: Array<{
    text: string;
    type: QuestionType;
    orderIndex: number;
    answerOptions: Array<{
      text: string;
      isCorrect: boolean;
    }>;
  }>,
) {
  if (questions.length === 0) {
    return ["Quiz must contain at least one question"];
  }

  const errors: string[] = [];

  questions.forEach((question, index) => {
    const questionNumber = index + 1;
    const label = `Question ${questionNumber}`;

    if (!question.text.trim()) {
      errors.push(`${label} must contain text`);
    }

    if (question.answerOptions.length < 2) {
      errors.push(`${label} must have at least two answer options`);
    }

    question.answerOptions.forEach((option, optionIndex) => {
      if (!option.text.trim()) {
        errors.push(
          `${label}, answer option ${optionIndex + 1} must contain text`,
        );
      }
    });

    const correctOptionsCount = question.answerOptions.filter(
      (option) => option.isCorrect,
    ).length;

    if (
      question.type === "SINGLE_CHOICE" &&
      correctOptionsCount !== 1
    ) {
      errors.push(`${label} must have exactly one correct answer`);
    }

    if (
      question.type === "MULTIPLE_CHOICE" &&
      correctOptionsCount < 1
    ) {
      errors.push(`${label} must have at least one correct answer`);
    }
  });

  return errors;
}

async function validateStatusChange(
  transaction: Prisma.TransactionClient,
  quizId: string,
  currentStatus: QuizStatus,
  nextStatus: QuizStatus,
) {
  if (nextStatus === "PUBLISHED") {
    const questions = await transaction.question.findMany({
      where: { quizId },
      orderBy: { orderIndex: "asc" },
      select: {
        text: true,
        type: true,
        orderIndex: true,
        answerOptions: {
          orderBy: { orderIndex: "asc" },
          select: {
            text: true,
            isCorrect: true,
          },
        },
      },
    });
    const validationErrors = getPublishValidationErrors(questions);

    if (validationErrors.length > 0) {
      throw new HttpError(
        400,
        "Quiz cannot be published",
        validationErrors,
      );
    }
  }

  if (currentStatus === "PUBLISHED" && nextStatus === "DRAFT") {
    const activeSession = await transaction.quizSession.findFirst({
      where: {
        quizId,
        status: {
          notIn: ["FINISHED", "CANCELLED"],
        },
      },
      select: { id: true },
    });

    if (activeSession) {
      throw new HttpError(
        409,
        "Cannot unpublish quiz while there is an active session.",
      );
    }
  }
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
  if (input.status === "PUBLISHED") {
    throw new HttpError(
      400,
      "Create the quiz as a draft, add questions, and publish it afterwards",
    );
  }

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
  const { categoryId, ...quizData } = input;

  return prisma.$transaction(
    async (transaction) => {
      const currentQuiz = await transaction.quiz.findUnique({
        where: { id: quizId },
        select: {
          creatorId: true,
          status: true,
        },
      });

      if (!currentQuiz) {
        throw new HttpError(404, "Quiz not found");
      }

      if (currentQuiz.creatorId !== userId) {
        throw new HttpError(403, "You can only manage your own quizzes");
      }

      if (input.status && input.status !== currentQuiz.status) {
        await validateStatusChange(
          transaction,
          quizId,
          currentQuiz.status,
          input.status,
        );
      }

      return transaction.quiz.update({
        where: {
          id: quizId,
          creatorId: userId,
        },
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
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
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
