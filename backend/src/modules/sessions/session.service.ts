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

function assertNotFinal(status: QuizSessionStatus) {
  if (finalStatuses.includes(status)) {
    throw new HttpError(400, `Session is already ${status.toLowerCase()}`);
  }
}

function assertHost(session: { hostId: string }, userId: string) {
  if (session.hostId !== userId) {
    throw new HttpError(403, "You can only control sessions you host");
  }
}

function serializeQuestion(
  question: SessionDetails["currentQuestion"],
  revealCorrectAnswers: boolean,
) {
  if (!question) {
    return null;
  }

  return {
    id: question.id,
    text: question.text,
    imageUrl: question.imageUrl,
    type: question.type,
    timeLimitSec: question.timeLimitSec,
    points: question.points,
    orderIndex: question.orderIndex,
    explanation: revealCorrectAnswers ? question.explanation : undefined,
    answerOptions: question.answerOptions.map((option) => ({
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
) {
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
    },
    host: session.host,
    participants: session.participants,
    currentQuestion: serializeQuestion(
      session.currentQuestion,
      revealCorrectAnswers,
    ),
  };
}

async function getSessionDetails(sessionId: string) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: sessionDetailsInclude,
  });

  if (!session) {
    throw new HttpError(404, "Session not found");
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
    throw new HttpError(404, "Session not found");
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
    throw new HttpError(404, "Quiz not found");
  }

  if (quiz.creatorId !== hostId) {
    throw new HttpError(403, "You can only host your own quizzes");
  }

  if (quiz.questions.length === 0) {
    throw new HttpError(400, "A quiz must have at least one question");
  }

  for (const question of quiz.questions) {
    if (question.answerOptions.length < 2) {
      throw new HttpError(
        400,
        `Question ${question.id} must have at least two answer options`,
      );
    }
  }

  const roomCode = await generateUniqueRoomCode();
  const session = await prisma.$transaction(async (transaction) => {
    const createdSession = await transaction.quizSession.create({
      data: {
        quizId,
        hostId,
        roomCode,
        status: "WAITING_FOR_PLAYERS",
      },
      select: {
        id: true,
        quizId: true,
        hostId: true,
        roomCode: true,
        status: true,
        createdAt: true,
      },
    });

    await transaction.sessionEvent.create({
      data: {
        sessionId: createdSession.id,
        actorUserId: hostId,
        eventType: SESSION_EVENT_TYPES.ROOM_CREATED,
      },
    });

    return createdSession;
  });

  return {
    ...session,
    quizTitle: quiz.title,
  };
}

export async function getSession(user: AuthUser, sessionId: string) {
  const session = await getSessionDetails(sessionId);
  const isHost = session.hostId === user.id;
  const isParticipant = session.participants.some(
    (participant) => participant.userId === user.id,
  );

  if (!isHost && !isParticipant && user.role !== "ADMIN") {
    throw new HttpError(403, "You do not have access to this session");
  }

  const revealCorrectAnswers =
    isHost ||
    user.role === "ADMIN" ||
    session.status === "SHOWING_ANSWER" ||
    session.status === "FINISHED";

  return serializeSession(session, revealCorrectAnswers);
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
    throw new HttpError(404, "Active session not found");
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
    throw new HttpError(404, "Session not found");
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
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
              take: 1,
              include: currentQuestionInclude,
            },
          },
        },
      },
    });

    if (!session) {
      throw new HttpError(404, "Session not found");
    }

    assertHost(session, hostId);

    if (session.status !== "WAITING_FOR_PLAYERS") {
      throw new HttpError(400, "Only a waiting session can be started");
    }

    const firstQuestion = session.quiz.questions[0];
    if (!firstQuestion) {
      throw new HttpError(400, "The quiz has no questions");
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
      throw new HttpError(409, "Session state changed; reload and try again");
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
      currentQuestion: serializeQuestion(firstQuestion, true),
    };
  });
}

export async function closeQuestion(hostId: string, sessionId: string) {
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.quizSession.findUnique({
      where: { id: sessionId },
      include: sessionDetailsInclude,
    });

    if (!session) {
      throw new HttpError(404, "Session not found");
    }

    assertHost(session, hostId);

    if (session.status !== "QUESTION_ACTIVE") {
      throw new HttpError(400, "Only an active question can be closed");
    }

    const transition = await transaction.quizSession.updateMany({
      where: {
        id: sessionId,
        status: "QUESTION_ACTIVE",
      },
      data: { status: "QUESTION_CLOSED" },
    });

    if (transition.count !== 1) {
      throw new HttpError(409, "Session state changed; reload and try again");
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
      throw new HttpError(404, "Session not found");
    }

    assertHost(session, hostId);

    if (session.status !== "QUESTION_CLOSED") {
      throw new HttpError(400, "Answer can only be shown after closing question");
    }

    const transition = await transaction.quizSession.updateMany({
      where: {
        id: sessionId,
        status: "QUESTION_CLOSED",
      },
      data: { status: "SHOWING_ANSWER" },
    });

    if (transition.count !== 1) {
      throw new HttpError(409, "Session state changed; reload and try again");
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
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        currentQuestion: {
          select: { id: true, orderIndex: true },
        },
      },
    });

    if (!session) {
      throw new HttpError(404, "Session not found");
    }

    assertHost(session, hostId);

    if (
      session.status !== "SHOWING_ANSWER" &&
      session.status !== "QUESTION_CLOSED"
    ) {
      throw new HttpError(
        400,
        "Next question is only available after closing the current question",
      );
    }

    if (!session.currentQuestion) {
      throw new HttpError(400, "Session has no current question");
    }

    const next = await transaction.question.findFirst({
      where: {
        quizId: session.quizId,
        orderIndex: { gt: session.currentQuestion.orderIndex },
      },
      orderBy: { orderIndex: "asc" },
      include: currentQuestionInclude,
    });

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
      throw new HttpError(409, "Session state changed; reload and try again");
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
        currentQuestion: serializeQuestion(next, true),
      },
    };
  });
}

export async function finishSession(hostId: string, sessionId: string) {
  return prisma.$transaction(
    (transaction) =>
      finishSessionTransaction(transaction, sessionId, hostId),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function cancelSession(hostId: string, sessionId: string) {
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.quizSession.findUnique({
      where: { id: sessionId },
      include: sessionDetailsInclude,
    });

    if (!session) {
      throw new HttpError(404, "Session not found");
    }

    assertHost(session, hostId);

    if (session.status === "FINISHED") {
      throw new HttpError(400, "A finished session cannot be cancelled");
    }

    if (session.status === "CANCELLED") {
      throw new HttpError(400, "Session is already cancelled");
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
      throw new HttpError(409, "Session state changed; reload and try again");
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
          throw new HttpError(404, "Session not found");
        }

        if (
          session.status !== "QUESTION_ACTIVE" ||
          !session.currentQuestion ||
          !session.currentQuestionStartedAt
        ) {
          throw new HttpError(400, "The session is not accepting answers");
        }

        if (input.questionId !== session.currentQuestionId) {
          throw new HttpError(400, "Answer is not for the current question");
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
          throw new HttpError(403, "You have not joined this session");
        }

        const question = session.currentQuestion;
        if (
          question.type === "SINGLE_CHOICE" &&
          input.selectedOptionIds.length !== 1
        ) {
          throw new HttpError(
            400,
            "SINGLE_CHOICE questions require exactly one option",
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
            "One or more selected options do not belong to this question",
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
          throw new HttpError(400, "The answer time limit has expired");
        }

        const correctOptionIds = question.answerOptions
          .filter((option) => option.isCorrect)
          .map((option) => option.id);
        const selectedSet = new Set(input.selectedOptionIds);
        const isCorrect =
          selectedSet.size === correctOptionIds.length &&
          correctOptionIds.every((optionId) => selectedSet.has(optionId));

        // TIME_BASED currently uses fixed points. A time bonus can be added
        // without changing the persisted answer contract.
        const scoreAwarded = isCorrect ? question.points : 0;

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

        const updatedParticipant =
          await transaction.sessionParticipant.update({
            where: { id: participant.id },
            data: {
              score: { increment: scoreAwarded },
            },
            select: {
              id: true,
              score: true,
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
            isCorrect: answer.isCorrect,
            scoreAwarded: answer.scoreAwarded,
            responseTimeMs: answer.responseTimeMs,
            answeredAt: answer.answeredAt,
          },
          participantScore: updatedParticipant.score,
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
        "You have already answered this question",
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
    throw new HttpError(404, "Session not found");
  }

  const participant = session.participants.find(
    (item) => item.userId === user.id,
  );
  if (
    session.hostId !== user.id &&
    !participant &&
    user.role !== "ADMIN"
  ) {
    throw new HttpError(403, "You do not have access to these results");
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
    throw new HttpError(404, "Session not found");
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
