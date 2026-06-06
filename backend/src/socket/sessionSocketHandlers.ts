import type { Server, Socket } from "socket.io";
import { z } from "zod";
import {
  getCurrentQuestionAnswersCount,
  getResults,
  getSession,
  closeQuestion,
  finishSession,
  nextQuestion,
  showAnswer,
  startSession,
  submitAnswer,
  onAutomaticQuestionClosed,
  restoreActiveQuestionTimers,
} from "../modules/sessions/session.service.js";
import { HttpError } from "../utils/httpError.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./socket.types.js";

type SessionServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

type SessionSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

const sessionPayloadSchema = z.object({
  sessionId: z.string().min(1),
});

const submitAnswerPayloadSchema = sessionPayloadSchema.extend({
  questionId: z.string().min(1),
  selectedOptionIds: z.array(z.string().min(1)).min(1).max(20),
});

function sessionRoom(sessionId: string) {
  return `session:${sessionId}`;
}

function requireRole(socket: SessionSocket, role: "ORGANIZER" | "PARTICIPANT") {
  if (socket.data.user.role !== role) {
    throw new HttpError(403, `Требуется роль ${role}`);
  }
}

function publicQuestion(
  question: Awaited<ReturnType<typeof getSession>>["currentQuestion"],
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
    options: question.answerOptions.map((option) => ({
      id: option.id,
      text: option.text,
      imageUrl: option.imageUrl,
      orderIndex: option.orderIndex,
    })),
  };
}

function sessionState(
  session: Awaited<ReturnType<typeof getSession>>,
) {
  return {
    sessionId: session.id,
    status: session.status,
    roomCode: session.roomCode,
    quizTitle: session.quiz.title,
    currentQuestionId: session.currentQuestionId,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.totalQuestions,
    hasAnsweredCurrentQuestion: session.hasAnsweredCurrentQuestion,
    canAnswerCurrentQuestion: session.canAnswerCurrentQuestion,
    currentQuestionStartedAt:
      session.currentQuestionStartedAt?.toISOString() ?? null,
    startedAt: session.startedAt?.toISOString() ?? null,
    finishedAt: session.finishedAt?.toISOString() ?? null,
    serverTime: new Date().toISOString(),
  };
}

function participantsPayload(
  session: Awaited<ReturnType<typeof getSession>>,
) {
  const revealScores =
    session.status === "SHOWING_ANSWER" || session.status === "FINISHED";

  return {
    sessionId: session.id,
    participants: session.participants.map((participant) => ({
      participantId: participant.id,
      displayName: participant.displayName,
      score: revealScores ? participant.score : 0,
      status: participant.status,
    })),
  };
}

function leaderboardPayload(
  result: Awaited<ReturnType<typeof getResults>>,
) {
  return {
    sessionId: result.session.id,
    leaderboard: result.leaderboard.map((entry) => ({
      place: entry.place,
      participantId: entry.participantId,
      displayName: entry.displayName,
      score: entry.finalScore,
      correctAnswersCount: entry.correctAnswersCount,
      totalAnswersCount: entry.totalAnswersCount,
      averageResponseTimeMs: entry.averageResponseTimeMs,
    })),
  };
}

async function emitSessionState(
  io: SessionServer,
  sessionId: string,
  actor: SocketData["user"],
) {
  const session = await getSession(actor, sessionId);
  io.to(sessionRoom(sessionId)).emit(
    "session:state-updated",
    sessionState(session),
  );
  return session;
}

async function emitParticipants(
  io: SessionServer,
  sessionId: string,
  actor: SocketData["user"],
) {
  const session = await getSession(actor, sessionId);
  io.to(sessionRoom(sessionId)).emit(
    "session:participants-updated",
    participantsPayload(session),
  );
}

async function emitLeaderboard(
  io: SessionServer,
  sessionId: string,
  actor: SocketData["user"],
) {
  const result = await getResults(actor, sessionId);
  const payload = leaderboardPayload(result);
  io.to(sessionRoom(sessionId)).emit("leaderboard:updated", payload);
  return payload.leaderboard;
}

function emitQuestionStarted(
  io: SessionServer,
  sessionId: string,
  session: Awaited<ReturnType<typeof getSession>>,
) {
  const question = publicQuestion(session.currentQuestion);
  if (!question) {
    return;
  }

  io.to(sessionRoom(sessionId)).emit("quiz:question-started", {
    sessionId,
    question: {
      ...question,
      timeLimitSec:
        question.timeLimitSec ?? session.quiz.defaultTimeLimitSec,
    },
    currentQuestionStartedAt:
      session.currentQuestionStartedAt?.toISOString() ?? null,
    serverTime: new Date().toISOString(),
  });

}

async function emitQuestionClosed(
  io: SessionServer,
  sessionId: string,
  actor: SocketData["user"],
) {
  const session = await getSession(actor, sessionId);
  const answersCount = await getCurrentQuestionAnswersCount(sessionId);

  io.to(sessionRoom(sessionId)).emit("quiz:question-closed", {
    sessionId,
    questionId: session.currentQuestionId,
    status: session.status,
    answersCount,
  });
  await emitSessionState(io, sessionId, actor);
}

export async function initializeSessionTimers(io: SessionServer) {
  onAutomaticQuestionClosed((sessionId, hostId) =>
    emitQuestionClosed(io, sessionId, {
      id: hostId,
      email: "",
      role: "ORGANIZER",
    }),
  );
  await restoreActiveQuestionTimers();
}

function emitSocketError(socket: SessionSocket, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected socket error";
  const code = error instanceof HttpError ? error.statusCode : undefined;
  socket.emit("error", { message, code });
}

function handle(
  socket: SessionSocket,
  callback: () => Promise<void>,
  rejection?: { sessionId: string; questionId?: string },
) {
  void callback().catch((error: unknown) => {
    if (rejection) {
      socket.emit("participant:answer-rejected", {
        ...rejection,
        reason: error instanceof Error ? error.message : "Ответ отклонён",
      });
      return;
    }
    emitSocketError(socket, error);
  });
}

export function registerSessionSocketHandlers(
  io: SessionServer,
  socket: SessionSocket,
) {
  socket.on("session:join", (rawPayload) => {
    handle(socket, async () => {
      const { sessionId } = sessionPayloadSchema.parse(rawPayload);
      const session = await getSession(socket.data.user, sessionId);

      await socket.join(sessionRoom(sessionId));
      socket.emit(
        "session:participants-updated",
        participantsPayload(session),
      );

      if (
        session.status === "QUESTION_ACTIVE" ||
        session.status === "QUESTION_CLOSED" ||
        session.status === "SHOWING_ANSWER"
      ) {
        const question = publicQuestion(session.currentQuestion);
        if (question) {
          socket.emit("quiz:question-started", {
            sessionId,
            question: {
              ...question,
              timeLimitSec:
                question.timeLimitSec ?? session.quiz.defaultTimeLimitSec,
            },
            currentQuestionStartedAt:
              session.currentQuestionStartedAt?.toISOString() ?? null,
            serverTime: new Date().toISOString(),
          });
        }

        socket.emit("answers:count-updated", {
          sessionId,
          answersCount: await getCurrentQuestionAnswersCount(sessionId),
        });
      }

      if (session.status === "SHOWING_ANSWER" && session.currentQuestion) {
        socket.emit("quiz:answer-shown", {
          sessionId,
          questionId: session.currentQuestion.id,
          correctOptionIds: session.currentQuestion.answerOptions
            .filter((option) => option.isCorrect)
            .map((option) => option.id),
          explanation: session.currentQuestion.explanation,
        });
      }

      socket.emit("session:state-updated", sessionState(session));

      if (socket.data.user.role === "PARTICIPANT") {
        await emitParticipants(io, sessionId, socket.data.user);
      }
    });
  });

  socket.on("session:leave", (rawPayload) => {
    handle(socket, async () => {
      const { sessionId } = sessionPayloadSchema.parse(rawPayload);
      await socket.leave(sessionRoom(sessionId));
    });
  });

  socket.on("organizer:session-start", (rawPayload) => {
    handle(socket, async () => {
      requireRole(socket, "ORGANIZER");
      const { sessionId } = sessionPayloadSchema.parse(rawPayload);
      await startSession(socket.data.user.id, sessionId);
      const session = await emitSessionState(io, sessionId, socket.data.user);
      emitQuestionStarted(io, sessionId, session);
    });
  });

  socket.on("organizer:question-close", (rawPayload) => {
    handle(socket, async () => {
      requireRole(socket, "ORGANIZER");
      const { sessionId } = sessionPayloadSchema.parse(rawPayload);
      await closeQuestion(socket.data.user.id, sessionId);
      await emitQuestionClosed(io, sessionId, socket.data.user);
    });
  });

  socket.on("organizer:show-answer", (rawPayload) => {
    handle(socket, async () => {
      requireRole(socket, "ORGANIZER");
      const { sessionId } = sessionPayloadSchema.parse(rawPayload);
      const session = await showAnswer(socket.data.user.id, sessionId);
      const question = session.currentQuestion;
      const leaderboard = await emitLeaderboard(
        io,
        sessionId,
        socket.data.user,
      );

      io.to(sessionRoom(sessionId)).emit("quiz:answer-shown", {
        sessionId,
        questionId: question?.id,
        correctOptionIds:
          question?.answerOptions
            .filter((option) => option.isCorrect)
            .map((option) => option.id) ?? [],
        explanation: question?.explanation,
        leaderboard,
      });
      await emitSessionState(io, sessionId, socket.data.user);
    });
  });

  socket.on("organizer:next-question", (rawPayload) => {
    handle(socket, async () => {
      requireRole(socket, "ORGANIZER");
      const { sessionId } = sessionPayloadSchema.parse(rawPayload);
      const result = await nextQuestion(socket.data.user.id, sessionId);

      if (!("leaderboard" in result)) {
        const session = await emitSessionState(
          io,
          sessionId,
          socket.data.user,
        );
        emitQuestionStarted(io, sessionId, session);
        return;
      }

      io.to(sessionRoom(sessionId)).emit("quiz:finished", {
        sessionId,
        status: "FINISHED",
        leaderboard: result.leaderboard.map((entry) => ({
          place: entry.place,
          participantId: entry.participantId,
          displayName: entry.displayName,
          score: entry.finalScore,
          correctAnswersCount: entry.correctAnswersCount,
          totalAnswersCount: entry.totalAnswersCount,
        })),
      });
      await emitSessionState(io, sessionId, socket.data.user);
      await emitLeaderboard(io, sessionId, socket.data.user);
    });
  });

  socket.on("organizer:session-finish", (rawPayload) => {
    handle(socket, async () => {
      requireRole(socket, "ORGANIZER");
      const { sessionId } = sessionPayloadSchema.parse(rawPayload);
      const result = await finishSession(socket.data.user.id, sessionId);
      const leaderboard = result.leaderboard.map((entry) => ({
        place: entry.place,
        participantId: entry.participantId,
        displayName: entry.displayName,
        score: entry.finalScore,
        correctAnswersCount: entry.correctAnswersCount,
        totalAnswersCount: entry.totalAnswersCount,
      }));

      io.to(sessionRoom(sessionId)).emit("quiz:finished", {
        sessionId,
        status: "FINISHED",
        leaderboard,
      });
      await emitSessionState(io, sessionId, socket.data.user);
      await emitLeaderboard(io, sessionId, socket.data.user);
    });
  });

  socket.on("participant:submit-answer", (rawPayload) => {
    const untrusted = rawPayload as Partial<{
      sessionId: string;
      questionId: string;
    }>;

    handle(
      socket,
      async () => {
        requireRole(socket, "PARTICIPANT");
        const payload = submitAnswerPayloadSchema.parse(rawPayload);
        const result = await submitAnswer(
          socket.data.user.id,
          payload.sessionId,
          {
            questionId: payload.questionId,
            selectedOptionIds: payload.selectedOptionIds,
          },
        );

        socket.emit("participant:answer-accepted", {
          sessionId: payload.sessionId,
          questionId: result.answer.questionId,
        });
        const answersCount = await getCurrentQuestionAnswersCount(
          payload.sessionId,
        );
        io.to(sessionRoom(payload.sessionId)).emit("answers:count-updated", {
          sessionId: payload.sessionId,
          answersCount,
        });
      },
      {
        sessionId: untrusted.sessionId ?? "",
        questionId: untrusted.questionId,
      },
    );
  });
}
