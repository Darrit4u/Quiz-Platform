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

const activeSessionWhere: Prisma.QuizSessionWhereInput = {
  status: {
    notIn: ["FINISHED", "CANCELLED"],
  },
};

const quizDetailsInclude = {
  category: true,
  questions: {
    orderBy: {
      orderIndex: Prisma.SortOrder.asc,
    },
    include: questionInclude,
  },
  sessions: {
    where: activeSessionWhere,
    select: {
      id: true,
    },
    take: 1,
  },
} as const;

type QuizMutationClient = Pick<
  Prisma.TransactionClient,
  "quiz" | "quizSession" | "question"
>;

export async function assertQuizHasNoActiveSession(
  quizId: string,
  client: Pick<Prisma.TransactionClient, "quizSession"> = prisma,
) {
  const activeSession = await client.quizSession.findFirst({
    where: {
      quizId,
      ...activeSessionWhere,
    },
    select: { id: true },
  });

  if (activeSession) {
    throw new HttpError(
      409,
      "Квиз нельзя редактировать, пока активна сессия.",
    );
  }
}

async function requireOwnedQuiz(
  userId: string,
  quizId: string,
  client: QuizMutationClient = prisma,
) {
  const quiz = await client.quiz.findUnique({
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
    throw new HttpError(404, "Квиз не найден");
  }

  if (quiz.creatorId !== userId) {
    throw new HttpError(403, "Можно управлять только собственными квизами");
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
    return ["Квиз должен содержать хотя бы один вопрос"];
  }

  const errors: string[] = [];

  questions.forEach((question, index) => {
    const questionNumber = index + 1;
    const label = `Вопрос ${questionNumber}`;

    if (!question.text.trim()) {
      errors.push(`${label}: отсутствует текст`);
    }

    if (question.answerOptions.length < 2) {
      errors.push(`${label}: должно быть не менее двух вариантов ответа`);
    }

    question.answerOptions.forEach((option, optionIndex) => {
      if (!option.text.trim()) {
        errors.push(
          `${label}, вариант ответа ${optionIndex + 1}: отсутствует текст`,
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
      errors.push(`${label}: должен быть один правильный ответ`);
    }

    if (
      question.type === "MULTIPLE_CHOICE" &&
      correctOptionsCount < 1
    ) {
      errors.push(`${label}: должен быть хотя бы один правильный ответ`);
    }
  });

  return errors;
}

async function validateStatusChange(
  transaction: Prisma.TransactionClient,
  quizId: string,
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
        "Квиз нельзя опубликовать",
        validationErrors,
      );
    }
  }

}

async function requireOwnedQuestion(
  userId: string,
  quizId: string,
  questionId: string,
  client: QuizMutationClient = prisma,
) {
  await requireOwnedQuiz(userId, quizId, client);

  const question = await client.question.findFirst({
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
    throw new HttpError(404, "Вопрос не найден");
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
      sessions: {
        where: activeSessionWhere,
        select: { id: true },
        take: 1,
      },
      _count: {
        select: {
          questions: true,
          sessions: true,
        },
      },
    },
  });

  return quizzes.map(({ _count, sessions, ...quiz }) => ({
    ...quiz,
    questionCount: _count.questions,
    sessionCount: _count.sessions,
    hasActiveSession: sessions.length > 0,
  }));
}

export async function createQuiz(userId: string, input: CreateQuizInput) {
  if (input.status === "PUBLISHED") {
    throw new HttpError(
      400,
      "Создайте квиз как черновик, добавьте вопросы, затем опубликуйте его",
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
    throw new HttpError(404, "Квиз не найден");
  }

  if (
    user.role !== "ADMIN" &&
    (user.role !== "ORGANIZER" || quiz.creatorId !== user.id)
  ) {
    throw new HttpError(403, "Нет доступа к этому квизу");
  }

  const { sessions, ...quizDetails } = quiz;

  return {
    ...quizDetails,
    hasActiveSession: sessions.length > 0,
  };
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
        throw new HttpError(404, "Квиз не найден");
      }

      if (currentQuiz.creatorId !== userId) {
        throw new HttpError(403, "Можно управлять только собственными квизами");
      }

      await assertQuizHasNoActiveSession(quizId, transaction);

      if (input.status && input.status !== currentQuiz.status) {
        await validateStatusChange(
          transaction,
          quizId,
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
  await prisma.$transaction(
    async (transaction) => {
      const quiz = await requireOwnedQuiz(userId, quizId, transaction);
      await assertQuizHasNoActiveSession(quizId, transaction);

      if (quiz._count.sessions > 0) {
        throw new HttpError(
          409,
          "Квиз с историей сессий нельзя удалить; переместите его в архив",
        );
      }

      await transaction.quiz.delete({ where: { id: quizId } });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function createQuestion(
  userId: string,
  quizId: string,
  input: CreateQuestionInput,
) {
  return prisma.$transaction(
    async (transaction) => {
      await requireOwnedQuiz(userId, quizId, transaction);
      await assertQuizHasNoActiveSession(quizId, transaction);

      const { options, ...questionData } = input;
      return transaction.question.create({
        data: {
          ...questionData,
          quizId,
          answerOptions: {
            create: options,
          },
        },
        include: questionInclude,
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function updateQuestion(
  userId: string,
  quizId: string,
  questionId: string,
  input: UpdateQuestionInput,
) {
  return prisma.$transaction(
    async (transaction) => {
      const currentQuestion = await requireOwnedQuestion(
        userId,
        quizId,
        questionId,
        transaction,
      );
      await assertQuizHasNoActiveSession(quizId, transaction);

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

      return transaction.question.update({
        where: { id: questionId },
        data: updateData,
        include: questionInclude,
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function deleteQuestion(
  userId: string,
  quizId: string,
  questionId: string,
) {
  await prisma.$transaction(
    async (transaction) => {
      const question = await requireOwnedQuestion(
        userId,
        quizId,
        questionId,
        transaction,
      );
      await assertQuizHasNoActiveSession(quizId, transaction);

      if (question._count.participantAnswers > 0) {
        throw new HttpError(
          409,
          "Вопрос с ответами участников нельзя удалить",
        );
      }

      await transaction.question.delete({ where: { id: questionId } });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
