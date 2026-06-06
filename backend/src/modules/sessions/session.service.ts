import {
  Prisma,
  type QuizSessionStatus,
} from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { generateUniqueRoomCode } from "../../utils/roomCode.js";
import type { AuthUser } from "../users/user.types.js";
import type {
  JoinSessionInput,
  SubmitAnswerInput,
} from "./session.schemas.js";
import { SESSION_EVENT_TYPES } from "./session.types.js";

const currentQuestionInclude = {
  answerOptions: {
    orderBy: { orderIndex: Prisma.SortOrder.asc },
  },
} as const;

const sessionDetailsInclude = {
  quiz: {
    select: {
      id: true,
      title: true,
      scoringMode: true,
      defaultTimeLimitSec: true,
      shuffleQuestions: true,
      shuffleAnswers: true,
      questions: {
        orderBy: { orderIndex: Prisma.SortOrder.asc },
        select: { id: true, orderIndex: true },
      },
    },
  },
  host: {
    select: {
      id: true,
      name: true,
    },
  },
  currentQuestion: {
    include: currentQuestionInclude,
  },
  participants: {
    orderBy: { joinedAt: Prisma.SortOrder.asc },
    select: {
      id: true,
      userId: true,
      displayName: true,
      status: true,
      score: true,
      joinedAt: true,
      leftAt: true,
    },
  },
} as const;

type SessionDetails = Prisma.QuizSessionGetPayload<{
  include: typeof sessionDetailsInclude;
}>;

const finalStatuses: QuizSessionStatus[] = ["FINISHED", "CANCELLED"];
const questionTimers = new Map<string, NodeJS.Timeout>();
const automaticCloseListeners = new Set<
  (sessionId: string, hostId: string) => void | Promise<void>
>();

function clearQuestionTimer(sessionId: string) {
  const timer = questionTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    questionTimers.delete(sessionId);
  }
}

function scheduleQuestionTimer(timer: {
  sessionId: string;
  hostId: string;
  currentQuestionStartedAt: Date;
  timeLimitSec: number;
}) {
  clearQuestionTimer(timer.sessionId);
  const deadline =
    timer.currentQuestionStartedAt.getTime() + timer.timeLimitSec * 1000;

  questionTimers.set(
    timer.sessionId,
    setTimeout(() => {
      questionTimers.delete(timer.sessionId);
      void closeQuestion(timer.hostId, timer.sessionId)
        .then(async () => {
          await Promise.allSettled(
            [...automaticCloseListeners].map((listener) =>
              listener(timer.sessionId, timer.hostId),
            ),
          );
        })
        .catch((error: unknown) => {
          if (
            !(error instanceof HttpError) ||
            ![400, 404, 409].includes(error.statusCode)
          ) {
            console.error("Automatic question close failed:", error);
          }
        });
    }, Math.max(0, deadline - Date.now())),
  );
}

export function onAutomaticQuestionClosed(
  listener: (sessionId: string, hostId: string) => void | Promise<void>,
) {
  automaticCloseListeners.add(listener);
  return () => automaticCloseListeners.delete(listener);
}

function seededHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicShuffle<T extends { id: string }>(
  items: T[],
  seed: string,
) {
  return [...items].sort(
    (left, right) =>
      seededHash(`${seed}:${left.id}`) - seededHash(`${seed}:${right.id}`),
  );
}

function getSessionQuestionOrder<
  T extends { id: string; orderIndex: number },
>(sessionId: string, shuffleQuestions: boolean, questions: T[]) {
  return shuffleQuestions
    ? deterministicShuffle(questions, `${sessionId}:questions`)
    : [...questions].sort((left, right) => left.orderIndex - right.orderIndex);
}

function assertNotFinal(status: QuizSessionStatus) {
  if (finalStatuses.includes(status)) {
    throw new HttpError(400, "Сессия уже завершена или отменена");
  }
}

function assertHost(session: { hostId: string }, userId: string) {
  if (session.hostId !== userId) {
    throw new HttpError(403, "Можно управлять только собственными сессиями");
  }
}

function serializeQuestion(
  question: SessionDetails["currentQuestion"],
  revealCorrectAnswers: boolean,
  sessionId: string,
  shuffleAnswers: boolean,
) {
  if (!question) {
    return null;
  }

  const answerOptions = shuffleAnswers
    ? deterministicShuffle(
        question.answerOptions,
        `${sessionId}:${question.id}:answers`,
      )
    : question.answerOptions;

  return {
    id: question.id,
    text: question.text,
    imageUrl: question.imageUrl,
    type: question.type,
    timeLimitSec: question.timeLimitSec,
    points: question.points,
    orderIndex: question.orderIndex,
    explanation: revealCorrectAnswers ? question.explanation : undefined,
    answerOptions: answerOptions.map((option) => ({
      id: option.id,
      text: option.text,
      imageUrl: option.imageUrl,
      orderIndex: option.orderIndex,
      ...(revealCorrectAnswers ? { isCorrect: option.isCorrect } : {}),
    })),
  };
}

function serializeSession(
  session: SessionDetails,
  revealCorrectAnswers: boolean,
  hasAnsweredCurrentQuestion = false,
  canAnswerCurrentQuestion = true,
) {
  const orderedQuestions = getSessionQuestionOrder(
    session.id,
    session.quiz.shuffleQuestions,
    session.quiz.questions,
  );
  const currentQuestionIndex = session.currentQuestionId
    ? orderedQuestions.findIndex(
        (question) => question.id === session.currentQuestionId,
      ) + 1
    : null;

  return {
    id: session.id,
    quizId: session.quizId,
    hostId: session.hostId,
    roomCode: session.roomCode,
    status: session.status,
    currentQuestionId: session.currentQuestionId,
    currentQuestionStartedAt: session.currentQuestionStartedAt,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    quiz: {
      id: session.quiz.id,
      title: session.quiz.title,
      defaultTimeLimitSec: session.quiz.defaultTimeLimitSec,
      scoringMode: session.quiz.scoringMode,
      shuffleQuestions: session.quiz.shuffleQuestions,
      shuffleAnswers: session.quiz.shuffleAnswers,
    },
    currentQuestionIndex:
      currentQuestionIndex && currentQuestionIndex > 0
        ? currentQuestionIndex
        : null,
    totalQuestions: session.quiz.questions.length,
    hasAnsweredCurrentQuestion,
    canAnswerCurrentQuestion,
    host: session.host,
    participants: session.participants.map((participant) => ({
      ...participant,
      score: revealCorrectAnswers ? participant.score : 0,
    })),
    currentQuestion: serializeQuestion(
      session.currentQuestion,
      revealCorrectAnswers,
      session.id,
      session.quiz.shuffleAnswers,
    ),
  };
}

async function getSessionDetails(sessionId: string) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: sessionDetailsInclude,
  });

  if (!session) {
    throw new HttpError(404, "Сессия не найдена");
  }

  return session;
}

async function getHostedSession(sessionId: string, hostId: string) {
  const session = await getSessionDetails(sessionId);
  assertHost(session, hostId);
  return session;
}

async function finishSessionTransaction(
  transaction: Prisma.TransactionClient,
  sessionId: string,
  actorUserId: string,
) {
  const session = await transaction.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        orderBy: [{ score: "desc" }, { joinedAt: "asc" }],
        include: {
          answers: {
            select: {
              isCorrect: true,
              responseTimeMs: true,
            },
          },
        },
      },
      quiz: {
        select: { title: true },
      },
    },
  });

  if (!session) {
    throw new HttpError(404, "Сессия не найдена");
  }

  assertHost(session, actorUserId);
  assertNotFinal(session.status);

  const resultRows = session.participants.map((participant, index) => {
    const responseTimes = participant.answers
      .map((answer) => answer.responseTimeMs)
      .filter((value): value is number => value !== null);
    const averageResponseTimeMs =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((sum, value) => sum + value, 0) /
              responseTimes.length,
          )
        : null;

    return {
      sessionId,
      participantId: participant.id,
      finalScore: participant.score,
      correctAnswersCount: participant.answers.filter(
        (answer) => answer.isCorrect,
      ).length,
      totalAnswersCount: participant.answers.length,
      averageResponseTimeMs,
      place: index + 1,
    };
  });

  if (resultRows.length > 0) {
    await transaction.sessionResult.createMany({
      data: resultRows,
      skipDuplicates: true,
    });
  }

  await transaction.sessionParticipant.updateMany({
    where: {
      sessionId,
      status: { notIn: ["KICKED", "LEFT"] },
    },
    data: {
      status: "FINISHED",
    },
  });

  const finishedAt = new Date();
  await transaction.quizSession.update({
    where: { id: sessionId },
    data: {
      status: "FINISHED",
      finishedAt,
      currentQuestionStartedAt: null,
    },
  });

  await transaction.sessionEvent.create({
    data: {
      sessionId,
      actorUserId,
      eventType: SESSION_EVENT_TYPES.QUIZ_FINISHED,
      payload: {
        participantCount: session.participants.length,
      },
    },
  });

  return {
    session: {
      id: session.id,
      quizId: session.quizId,
      roomCode: session.roomCode,
      status: "FINISHED" as const,
      finishedAt,
      quiz: session.quiz,
    },
    leaderboard: resultRows.map((result, index) => ({
      place: result.place,
      participantId: result.participantId,
      displayName: session.participants[index]?.displayName ?? "",
      finalScore: result.finalScore,
      correctAnswersCount: result.correctAnswersCount,
      totalAnswersCount: result.totalAnswersCount,
      averageResponseTimeMs: result.averageResponseTimeMs,
    })),
  };
}

export async function createSession(hostId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          answerOptions: {
            select: {
              id: true,
              isCorrect: true,
            },
          },
        },
      },
    },
  });

  if (!quiz) {
    throw new HttpError(404, "Квиз не найден");
  }

  if (quiz.creatorId !== hostId) {
    throw new HttpError(403, "Можно проводить только собственные квизы");
  }

  if (quiz.status !== "PUBLISHED") {
    throw new HttpError(400, "Проводить можно только опубликованные квизы");
  }

  if (quiz.questions.length === 0) {
    throw new HttpError(400, "Квиз должен содержать хотя бы один вопрос");
  }

  for (const question of quiz.questions) {
    if (question.answerOptions.length < 2) {
      throw new HttpError(
        400,
        `Вопрос ${question.id} должен содержать не менее двух вариантов ответа`,
      );
    }
  }

  const roomCode = await generateUniqueRoomCode();
  const sessionSelect = {
    id: true,
    quizId: true,
    hostId: true,
    roomCode: true,
    status: true,
    createdAt: true,
  } as const;

  const createOrReuseSession = () =>
    prisma.$transaction(
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

        if (currentQuiz.creatorId !== hostId) {
          throw new HttpError(403, "Можно проводить только собственные квизы");
        }

        if (currentQuiz.status !== "PUBLISHED") {
          throw new HttpError(400, "Проводить можно только опубликованные квизы");
        }

        const activeSession = await transaction.quizSession.findFirst({
          where: {
            quizId,
            status: { notIn: finalStatuses },
          },
          orderBy: { createdAt: "desc" },
          select: sessionSelect,
        });

        if (activeSession) {
          return activeSession;
        }

        const createdSession = await transaction.quizSession.create({
          data: {
            quizId,
            hostId,
            roomCode,
            status: "WAITING_FOR_PLAYERS",
          },
          select: sessionSelect,
        });

        await transaction.sessionEvent.create({
          data: {
            sessionId: createdSession.id,
            actorUserId: hostId,
            eventType: SESSION_EVENT_TYPES.ROOM_CREATED,
          },
        });

        return createdSession;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

  let session;
  try {
    session = await createOrReuseSession();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      const activeSession = await prisma.quizSession.findFirst({
        where: {
          quizId,
          hostId,
          status: { notIn: finalStatuses },
        },
        orderBy: { createdAt: "desc" },
        select: sessionSelect,
      });

      if (activeSession) {
        session = activeSession;
      } else {
        session = await createOrReuseSession();
      }
    } else {
      throw error;
    }
  }

  return {
    ...session,
    quizTitle: quiz.title,
  };
}

export async function getSession(user: AuthUser, sessionId: string) {
  const session = await getSessionDetails(sessionId);
  const isHost = session.hostId === user.id;
  const participant = session.participants.find(
    (participant) => participant.userId === user.id,
  );

  if (!isHost && !participant && user.role !== "ADMIN") {
    throw new HttpError(403, "Нет доступа к этой сессии");
  }

  const revealCorrectAnswers =
    isHost ||
    user.role === "ADMIN" ||
    session.status === "SHOWING_ANSWER" ||
    session.status === "FINISHED";

  const hasAnsweredCurrentQuestion =
    Boolean(participant && session.currentQuestionId) &&
    Boolean(
      await prisma.participantAnswer.findUnique({
        where: {
          participantId_questionId: {
            participantId: participant!.id,
            questionId: session.currentQuestionId!,
          },
        },
        select: { id: true },
      }),
    );
  const canAnswerCurrentQuestion =
    !participant ||
    !session.currentQuestionStartedAt ||
    participant.joinedAt <= session.currentQuestionStartedAt;

  return serializeSession(
    session,
    revealCorrectAnswers,
    hasAnsweredCurrentQuestion,
    canAnswerCurrentQuestion,
  );
}

export async function getSessionByCode(roomCode: string) {
  const session = await prisma.quizSession.findFirst({
    where: {
      roomCode,
      status: {
        notIn: ["FINISHED", "CANCELLED"],
      },
    },
    select: {
      id: true,
      roomCode: true,
      status: true,
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
      host: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  if (!session) {
    throw new HttpError(404, "Активная сессия не найдена");
  }

  const { _count, ...details } = session;
  return {
    ...details,
    participantCount: _count.participants,
  };
}

export async function joinSession(
  userId: string,
  roomCode: string,
  input: JoinSessionInput,
) {
  const session = await prisma.quizSession.findUnique({
    where: { roomCode },
    select: {
      id: true,
      status: true,
      roomCode: true,
      quiz: {
        select: { id: true, title: true },
      },
    },
  });

  if (!session) {
    throw new HttpError(404, "Сессия не найдена");
  }

  assertNotFinal(session.status);

  const existingParticipant = await prisma.sessionParticipant.findUnique({
    where: {
      sessionId_userId: {
        sessionId: session.id,
        userId,
      },
    },
  });

  if (existingParticipant) {
    return {
      participant: existingParticipant,
      session,
    };
  }

  try {
    const participant = await prisma.$transaction(async (transaction) => {
      const createdParticipant = await transaction.sessionParticipant.create({
        data: {
          sessionId: session.id,
          userId,
          displayName: input.displayName,
          status: "JOINED",
        },
      });

      await transaction.sessionEvent.create({
        data: {
          sessionId: session.id,
          actorUserId: userId,
          eventType: SESSION_EVENT_TYPES.PARTICIPANT_JOINED,
          payload: {
            participantId: createdParticipant.id,
            displayName: createdParticipant.displayName,
          },
        },
      });

      return createdParticipant;
    });

    return { participant, session };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const participant = await prisma.sessionParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId: session.id,
            userId,
          },
        },
      });

      if (participant) {
        return { participant, session };
      }
    }

    throw error;
  }
}

export async function startSession(hostId: string, sessionId: string) {
  const result = await prisma.$transaction(async (transaction) => {
    const session = await transaction.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
              include: currentQuestionInclude,
            },
          },
        },
      },
    });

    if (!session) {
      throw new HttpError(404, "Сессия не найдена");
    }

    assertHost(session, hostId);

    if (session.status !== "WAITING_FOR_PLAYERS") {
      throw new HttpError(400, "Запустить можно только ожидающую сессию");
    }

    const [firstQuestion] = getSessionQuestionOrder(
      session.id,
      session.quiz.shuffleQuestions,
      session.quiz.questions,
    );
    if (!firstQuestion) {
      throw new HttpError(400, "В квизе нет вопросов");
    }

    const now = new Date();
    const transition = await transaction.quizSession.updateMany({
      where: {
        id: sessionId,
        status: "WAITING_FOR_PLAYERS",
      },
      data: {
        status: "QUESTION_ACTIVE",
        currentQuestionId: firstQuestion.id,
        currentQuestionStartedAt: now,
        startedAt: now,
      },
    });

    if (transition.count !== 1) {
      throw new HttpError(409, "Состояние сессии изменилось; обновите страницу и повторите попытку");
    }

    await transaction.sessionEvent.createMany({
      data: [
        {
          sessionId,
          actorUserId: hostId,
          eventType: SESSION_EVENT_TYPES.QUIZ_STARTED,
        },
        {
          sessionId,
          actorUserId: hostId,
          eventType: SESSION_EVENT_TYPES.QUESTION_STARTED,
          payload: { questionId: firstQuestion.id },
        },
      ],
    });

    return {
      id: session.id,
      quizId: session.quizId,
      hostId: session.hostId,
      roomCode: session.roomCode,
      status: "QUESTION_ACTIVE" as const,
      currentQuestionStartedAt: now,
      startedAt: now,
      timeLimitSec:
        firstQuestion.timeLimitSec ?? session.quiz.defaultTimeLimitSec,
      currentQuestion: serializeQuestion(
        firstQuestion,
        true,
        session.id,
        session.quiz.shuffleAnswers,
      ),
    };
  });

  scheduleQuestionTimer({
    sessionId,
    hostId,
    currentQuestionStartedAt: result.currentQuestionStartedAt,
    timeLimitSec: result.timeLimitSec,
  });

  return result;
}

export async function closeQuestion(hostId: string, sessionId: string) {
  clearQuestionTimer(sessionId);
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.quizSession.findUnique({
      where: { id: sessionId },
      include: sessionDetailsInclude,
    });

    if (!session) {
      throw new HttpError(404, "Сессия не найдена");
    }

    assertHost(session, hostId);

    if (session.status !== "QUESTION_ACTIVE") {
      throw new HttpError(400, "Закрыть можно только активный вопрос");
    }

    const transition = await transaction.quizSession.updateMany({
      where: {
        id: sessionId,
        status: "QUESTION_ACTIVE",
      },
      data: { status: "QUESTION_CLOSED" },
    });

    if (transition.count !== 1) {
      throw new HttpError(409, "Состояние сессии изменилось; обновите страницу и повторите попытку");
    }

    await transaction.sessionEvent.create({
      data: {
        sessionId,
        actorUserId: hostId,
        eventType: SESSION_EVENT_TYPES.QUESTION_CLOSED,
        payload: { questionId: session.currentQuestionId },
      },
    });

    const updatedSession = await transaction.quizSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: sessionDetailsInclude,
    });

    return serializeSession(updatedSession, true);
  });
}

export async function showAnswer(hostId: string, sessionId: string) {
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.quizSession.findUnique({
      where: { id: sessionId },
      include: sessionDetailsInclude,
    });

    if (!session) {
      throw new HttpError(404, "Сессия не найдена");
    }

    assertHost(session, hostId);

    if (session.status !== "QUESTION_CLOSED") {
      throw new HttpError(400, "Ответ можно показать только после закрытия вопроса");
    }

    const transition = await transaction.quizSession.updateMany({
      where: {
        id: sessionId,
        status: "QUESTION_CLOSED",
      },
      data: { status: "SHOWING_ANSWER" },
    });

    if (transition.count !== 1) {
      throw new HttpError(409, "Состояние сессии изменилось; обновите страницу и повторите попытку");
    }

    await transaction.sessionEvent.create({
      data: {
        sessionId,
        actorUserId: hostId,
        eventType: SESSION_EVENT_TYPES.ANSWER_SHOWN,
        payload: { questionId: session.currentQuestionId },
      },
    });

    const updatedSession = await transaction.quizSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: sessionDetailsInclude,
    });

    return serializeSession(updatedSession, true);
  });
}

export async function nextQuestion(hostId: string, sessionId: string) {
  clearQuestionTimer(sessionId);
  const result = await prisma.$transaction(async (transaction) => {
    const session = await transaction.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        currentQuestion: {
          select: { id: true, orderIndex: true },
        },
        quiz: {
          select: {
            defaultTimeLimitSec: true,
            shuffleQuestions: true,
            shuffleAnswers: true,
            questions: {
              orderBy: { orderIndex: "asc" },
              include: currentQuestionInclude,
            },
          },
        },
      },
    });

    if (!session) {
      throw new HttpError(404, "Сессия не найдена");
    }

    assertHost(session, hostId);

    if (
      session.status !== "SHOWING_ANSWER" &&
      session.status !== "QUESTION_CLOSED"
    ) {
      throw new HttpError(
        400,
        "Следующий вопрос доступен только после закрытия текущего вопроса",
      );
    }

    if (!session.currentQuestion) {
      throw new HttpError(400, "В сессии нет текущего вопроса");
    }

    const questionOrder = getSessionQuestionOrder(
      session.id,
      session.quiz.shuffleQuestions,
      session.quiz.questions,
    );
    const currentIndex = questionOrder.findIndex(
      (question) => question.id === session.currentQuestion?.id,
    );
    const next = questionOrder[currentIndex + 1];

    if (!next) {
      return finishSessionTransaction(transaction, sessionId, hostId);
    }

    const now = new Date();
    const transition = await transaction.quizSession.updateMany({
      where: {
        id: sessionId,
        currentQuestionId: session.currentQuestion.id,
        status: { in: ["SHOWING_ANSWER", "QUESTION_CLOSED"] },
      },
      data: {
        currentQuestionId: next.id,
        status: "QUESTION_ACTIVE",
        currentQuestionStartedAt: now,
      },
    });

    if (transition.count !== 1) {
      throw new HttpError(409, "Состояние сессии изменилось; обновите страницу и повторите попытку");
    }

    await transaction.sessionEvent.create({
      data: {
        sessionId,
        actorUserId: hostId,
        eventType: SESSION_EVENT_TYPES.QUESTION_STARTED,
        payload: { questionId: next.id },
      },
    });

    return {
      finished: false,
      session: {
        id: session.id,
        status: "QUESTION_ACTIVE" as const,
        currentQuestionStartedAt: now,
        timeLimitSec:
          next.timeLimitSec ?? session.quiz.defaultTimeLimitSec,
        currentQuestion: serializeQuestion(
          next,
          true,
          session.id,
          session.quiz.shuffleAnswers,
        ),
      },
    };
  });

  if (!("leaderboard" in result)) {
    scheduleQuestionTimer({
      sessionId,
      hostId,
      currentQuestionStartedAt: result.session.currentQuestionStartedAt,
      timeLimitSec: result.session.timeLimitSec,
    });
  }

  return result;
}

export async function finishSession(hostId: string, sessionId: string) {
  clearQuestionTimer(sessionId);
  return prisma.$transaction(
    (transaction) =>
      finishSessionTransaction(transaction, sessionId, hostId),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function cancelSession(hostId: string, sessionId: string) {
  clearQuestionTimer(sessionId);
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.quizSession.findUnique({
      where: { id: sessionId },
      include: sessionDetailsInclude,
    });

    if (!session) {
      throw new HttpError(404, "Сессия не найдена");
    }

    assertHost(session, hostId);

    if (session.status === "FINISHED") {
      throw new HttpError(400, "Завершённую сессию нельзя отменить");
    }

    if (session.status === "CANCELLED") {
      throw new HttpError(400, "Сессия уже отменена");
    }

    const transition = await transaction.quizSession.updateMany({
      where: {
        id: sessionId,
        status: { notIn: ["FINISHED", "CANCELLED"] },
      },
      data: {
        status: "CANCELLED",
        finishedAt: new Date(),
        currentQuestionStartedAt: null,
      },
    });

    if (transition.count !== 1) {
      throw new HttpError(409, "Состояние сессии изменилось; обновите страницу и повторите попытку");
    }

    await transaction.sessionEvent.create({
      data: {
        sessionId,
        actorUserId: hostId,
        eventType: SESSION_EVENT_TYPES.QUIZ_CANCELLED,
      },
    });

    const updatedSession = await transaction.quizSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: sessionDetailsInclude,
    });

    return serializeSession(updatedSession, true);
  });
}

export async function submitAnswer(
  userId: string,
  sessionId: string,
  input: SubmitAnswerInput,
) {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const session = await transaction.quizSession.findUnique({
          where: { id: sessionId },
          include: {
            quiz: {
              select: {
                scoringMode: true,
                defaultTimeLimitSec: true,
              },
            },
            currentQuestion: {
              include: currentQuestionInclude,
            },
          },
        });

        if (!session) {
          throw new HttpError(404, "Сессия не найдена");
        }

        if (
          session.status !== "QUESTION_ACTIVE" ||
          !session.currentQuestion ||
          !session.currentQuestionStartedAt
        ) {
          throw new HttpError(400, "Сессия сейчас не принимает ответы");
        }

        if (input.questionId !== session.currentQuestionId) {
          throw new HttpError(400, "Ответ относится не к текущему вопросу");
        }

        const participant =
          await transaction.sessionParticipant.findUnique({
            where: {
              sessionId_userId: {
                sessionId,
                userId,
              },
            },
          });

        if (!participant || participant.status !== "JOINED") {
          throw new HttpError(403, "Вы не подключились к этой сессии");
        }

        if (participant.joinedAt > session.currentQuestionStartedAt) {
          throw new HttpError(
            403,
            "Вы подключились после начала вопроса. Ответить можно будет на следующий вопрос.",
          );
        }

        const question = session.currentQuestion;
        if (
          question.type === "SINGLE_CHOICE" &&
          input.selectedOptionIds.length !== 1
        ) {
          throw new HttpError(
            400,
            "Для вопроса с одним ответом нужно выбрать ровно один вариант",
          );
        }

        const validOptionIds = new Set(
          question.answerOptions.map((option) => option.id),
        );
        if (
          input.selectedOptionIds.some(
            (optionId) => !validOptionIds.has(optionId),
          )
        ) {
          throw new HttpError(
            400,
            "Один или несколько выбранных вариантов не относятся к этому вопросу",
          );
        }

        const now = new Date();
        const responseTimeMs = Math.max(
          0,
          now.getTime() - session.currentQuestionStartedAt.getTime(),
        );
        const timeLimitSec =
          question.timeLimitSec ?? session.quiz.defaultTimeLimitSec;

        if (responseTimeMs > timeLimitSec * 1000) {
          throw new HttpError(400, "Время на ответ истекло");
        }

        const correctOptionIds = question.answerOptions
          .filter((option) => option.isCorrect)
          .map((option) => option.id);
        const selectedSet = new Set(input.selectedOptionIds);
        const isCorrect =
          selectedSet.size === correctOptionIds.length &&
          correctOptionIds.every((optionId) => selectedSet.has(optionId));

        const totalTimeMs = timeLimitSec * 1000;
        const remainingTimeRatio = Math.max(
          0,
          (totalTimeMs - responseTimeMs) / totalTimeMs,
        );
        const scoreAwarded = !isCorrect
          ? 0
          : session.quiz.scoringMode === "TIME_BASED"
            ? Math.max(1, Math.round(question.points * remainingTimeRatio))
            : question.points;

        const answer = await transaction.participantAnswer.create({
          data: {
            sessionId,
            participantId: participant.id,
            questionId: question.id,
            selectedOptionIds: input.selectedOptionIds,
            isCorrect,
            scoreAwarded,
            responseTimeMs,
            answeredAt: now,
          },
        });

        await transaction.sessionParticipant.update({
          where: { id: participant.id },
          data: {
            score: { increment: scoreAwarded },
          },
        });

        await transaction.sessionEvent.create({
          data: {
            sessionId,
            actorUserId: userId,
            eventType: SESSION_EVENT_TYPES.ANSWER_SUBMITTED,
            payload: {
              participantId: participant.id,
              questionId: question.id,
              isCorrect,
              scoreAwarded,
              responseTimeMs,
            },
          },
        });

        return {
          answer: {
            id: answer.id,
            questionId: answer.questionId,
            selectedOptionIds: answer.selectedOptionIds,
            answeredAt: answer.answeredAt,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "Вы уже ответили на этот вопрос",
      );
    }

    throw error;
  }
}

export async function getResults(user: AuthUser, sessionId: string) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: {
        select: { id: true, title: true },
      },
      participants: {
        orderBy: [{ score: "desc" }, { joinedAt: "asc" }],
        include: {
          answers: {
            select: {
              isCorrect: true,
              responseTimeMs: true,
            },
          },
          result: true,
        },
      },
    },
  });

  if (!session) {
    throw new HttpError(404, "Сессия не найдена");
  }

  const participant = session.participants.find(
    (item) => item.userId === user.id,
  );
  if (
    session.hostId !== user.id &&
    !participant &&
    user.role !== "ADMIN"
  ) {
    throw new HttpError(403, "Нет доступа к этим результатам");
  }

  if (
    participant &&
    session.hostId !== user.id &&
    user.role !== "ADMIN" &&
    session.status !== "FINISHED"
  ) {
    throw new HttpError(
      409,
      "Результаты будут доступны после завершения квиза",
    );
  }

  const leaderboard = session.participants
    .map((item, index) => {
      if (session.status === "FINISHED" && item.result) {
        return {
          place: item.result.place,
          participantId: item.id,
          displayName: item.displayName,
          finalScore: item.result.finalScore,
          correctAnswersCount: item.result.correctAnswersCount,
          totalAnswersCount: item.result.totalAnswersCount,
          averageResponseTimeMs: item.result.averageResponseTimeMs,
        };
      }

      const responseTimes = item.answers
        .map((answer) => answer.responseTimeMs)
        .filter((value): value is number => value !== null);

      return {
        place: index + 1,
        participantId: item.id,
        displayName: item.displayName,
        finalScore: item.score,
        correctAnswersCount: item.answers.filter((answer) => answer.isCorrect)
          .length,
        totalAnswersCount: item.answers.length,
        averageResponseTimeMs:
          responseTimes.length > 0
            ? Math.round(
                responseTimes.reduce((sum, value) => sum + value, 0) /
                  responseTimes.length,
              )
            : null,
      };
    })
    .sort((left, right) => left.place - right.place);

  return {
    session: {
      id: session.id,
      status: session.status,
      quiz: session.quiz,
      finishedAt: session.finishedAt,
    },
    leaderboard,
  };
}

export async function getCurrentQuestionAnswersCount(sessionId: string) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: { currentQuestionId: true },
  });

  if (!session) {
    throw new HttpError(404, "Сессия не найдена");
  }

  if (!session.currentQuestionId) {
    return 0;
  }

  return prisma.participantAnswer.count({
    where: {
      sessionId,
      questionId: session.currentQuestionId,
    },
  });
}

export async function getActiveQuestionTimers() {
  const sessions = await prisma.quizSession.findMany({
    where: {
      status: "QUESTION_ACTIVE",
      currentQuestionId: { not: null },
      currentQuestionStartedAt: { not: null },
    },
    select: {
      id: true,
      hostId: true,
      currentQuestionStartedAt: true,
      currentQuestion: {
        select: { timeLimitSec: true },
      },
      quiz: {
        select: { defaultTimeLimitSec: true },
      },
    },
  });

  return sessions.flatMap((session) =>
    session.currentQuestionStartedAt
      ? [
          {
            sessionId: session.id,
            hostId: session.hostId,
            currentQuestionStartedAt: session.currentQuestionStartedAt,
            timeLimitSec:
              session.currentQuestion?.timeLimitSec ??
              session.quiz.defaultTimeLimitSec,
          },
        ]
      : [],
  );
}

export async function restoreActiveQuestionTimers() {
  const timers = await getActiveQuestionTimers();
  for (const timer of timers) {
    scheduleQuestionTimer(timer);
  }
}

export async function getHostedSessions(hostId: string) {
  const sessions = await prisma.quizSession.findMany({
    where: { hostId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      roomCode: true,
      status: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  return sessions.map(({ _count, ...session }) => ({
    ...session,
    participantCount: _count.participants,
  }));
}

export async function getParticipatedSessions(userId: string) {
  const participations = await prisma.sessionParticipant.findMany({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    select: {
      id: true,
      displayName: true,
      score: true,
      joinedAt: true,
      status: true,
      result: {
        select: {
          place: true,
          finalScore: true,
        },
      },
      session: {
        select: {
          id: true,
          roomCode: true,
          status: true,
          finishedAt: true,
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  return participations.map((participation) => ({
    participantId: participation.id,
    displayName: participation.displayName,
    participantStatus: participation.status,
    score: participation.result?.finalScore ?? participation.score,
    place: participation.result?.place ?? null,
    joinedAt: participation.joinedAt,
    session: participation.session,
  }));
}
