import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getStoredToken } from "@/api/httpClient";
import { createSessionSocket } from "@/socket/socket";
import type {
  AnswerStatus,
  SessionLeaderboardEntry,
  SessionCommand,
  SessionParticipant,
  SessionQuestion,
  SessionState,
} from "@/types/session";

interface QuestionStartedPayload {
  sessionId: string;
  question: SessionQuestion;
  currentQuestionStartedAt: string;
  serverTime: string;
}

interface AnswerShownPayload {
  sessionId: string;
  questionId: string;
  correctOptionIds: string[];
  explanation?: string | null;
  leaderboard?: SessionLeaderboardEntry[];
}

interface UseSessionSocketResult {
  isConnected: boolean;
  sessionState: SessionState | null;
  participants: SessionParticipant[];
  currentQuestion: SessionQuestion | null;
  leaderboard: SessionLeaderboardEntry[];
  answerStatus: AnswerStatus;
  answersCount: number;
  remainingSeconds: number;
  error: string;
  pendingCommand: SessionCommand | null;
  startSession: () => void;
  closeQuestion: () => void;
  showAnswer: () => void;
  nextQuestion: () => void;
  finishSession: () => void;
  submitAnswer: (questionId: string, selectedOptionIds: string[]) => void;
}

export function useSessionSocket(
  sessionId: string | undefined,
): UseSessionSocketResult {
  const socketRef = useRef<Socket | null>(null);
  const clockOffsetRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [currentQuestion, setCurrentQuestion] =
    useState<SessionQuestion | null>(null);
  const [leaderboard, setLeaderboard] = useState<SessionLeaderboardEntry[]>([]);
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>({
    state: "idle",
  });
  const [answersCount, setAnswersCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState("");
  const [pendingCommand, setPendingCommand] =
    useState<SessionCommand | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const socket = createSessionSocket();
    if (!socket) {
      return;
    }

    socketRef.current = socket;

    const syncClock = (serverTime?: string) => {
      if (serverTime) {
        clockOffsetRef.current = Date.now() - new Date(serverTime).getTime();
      }
    };

    socket.on("connect", () => {
      setIsConnected(true);
      setError("");
      socket.emit("session:join", { sessionId });
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
      setPendingCommand(null);
      setError("Соединение потеряно. Выполняется повторное подключение...");
    });
    socket.on("connect_error", () => {
      setIsConnected(false);
      setPendingCommand(null);
      setError("Не удалось подключиться к серверу");
    });
    socket.on("error", (payload: { message?: string }) => {
      setError(payload.message ?? "Ошибка соединения");
      setPendingCommand(null);
    });
    socket.on("session:state-updated", (payload: SessionState) => {
      syncClock(payload.serverTime);
      setSessionState(payload);
      setPendingCommand(null);
      setError("");
      if (payload.hasAnsweredCurrentQuestion) {
        setAnswerStatus((current) =>
          current.state === "accepted" ? current : { state: "submitted" },
        );
      } else {
        setAnswerStatus((current) =>
          current.state === "submitted" ? { state: "idle" } : current,
        );
      }
    });
    socket.on(
      "session:participants-updated",
      (payload: {
        sessionId: string;
        participants: SessionParticipant[];
      }) => setParticipants(payload.participants),
    );
    socket.on(
      "answers:count-updated",
      (payload: { answersCount: number }) => {
        setAnswersCount(payload.answersCount);
      },
    );
    socket.on("quiz:question-started", (payload: QuestionStartedPayload) => {
      syncClock(payload.serverTime);
      setCurrentQuestion(payload.question);
      setAnswersCount(0);
      setAnswerStatus({ state: "idle" });
      setPendingCommand(null);
      setError("");
      setSessionState((current) =>
        current
          ? {
              ...current,
              status: "QUESTION_ACTIVE",
              currentQuestionId: payload.question.id,
              currentQuestionStartedAt: payload.currentQuestionStartedAt,
              serverTime: payload.serverTime,
            }
          : current,
      );
    });
    socket.on(
      "quiz:question-closed",
      (payload: { answersCount?: number }) => {
        setAnswersCount(payload.answersCount ?? 0);
        setPendingCommand(null);
        setError("");
        setSessionState((current) =>
          current ? { ...current, status: "QUESTION_CLOSED" } : current,
        );
      },
    );
    socket.on("quiz:answer-shown", (payload: AnswerShownPayload) => {
      setCurrentQuestion((question) =>
        question && question.id === payload.questionId
          ? {
              ...question,
              correctOptionIds: payload.correctOptionIds,
              explanation: payload.explanation,
            }
          : question,
      );
      setSessionState((current) =>
        current ? { ...current, status: "SHOWING_ANSWER" } : current,
      );
      if (payload.leaderboard) {
        setLeaderboard(payload.leaderboard);
      }
      setPendingCommand(null);
      setError("");
    });
    socket.on(
      "leaderboard:updated",
      (payload: { leaderboard: SessionLeaderboardEntry[] }) => {
        setLeaderboard(payload.leaderboard);
      },
    );
    socket.on(
      "participant:answer-accepted",
      () => {
        setAnswerStatus({ state: "accepted" });
        setError("");
      },
    );
    socket.on(
      "participant:answer-rejected",
      (payload: { reason?: string }) => {
        setAnswerStatus({
          state: "rejected",
          reason: payload.reason ?? "Ответ отклонён",
        });
      },
    );
    socket.on(
      "quiz:finished",
      (payload: { leaderboard: SessionLeaderboardEntry[] }) => {
        setLeaderboard(payload.leaderboard);
        setPendingCommand(null);
        setError("");
        setSessionState((current) =>
          current
            ? {
                ...current,
                status: "FINISHED",
                finishedAt: new Date().toISOString(),
              }
            : current,
        );
      },
    );

    socket.connect();

    return () => {
      socket.emit("session:leave", { sessionId });
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    const updateRemainingTime = () => {
      if (
        sessionState?.status !== "QUESTION_ACTIVE" ||
        !sessionState.currentQuestionStartedAt ||
        !currentQuestion
      ) {
        setRemainingSeconds(0);
        return;
      }

      const serverNow = Date.now() - clockOffsetRef.current;
      const deadline =
        new Date(sessionState.currentQuestionStartedAt).getTime() +
        currentQuestion.timeLimitSec * 1000;
      setRemainingSeconds(Math.max(0, Math.ceil((deadline - serverNow) / 1000)));
    };

    updateRemainingTime();
    const timer = window.setInterval(updateRemainingTime, 250);
    return () => window.clearInterval(timer);
  }, [currentQuestion, sessionState]);

  const emit = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (!socketRef.current?.connected) {
        setError("Соединение с сервером ещё не установлено");
        return false;
      }
      setError("");
      socketRef.current.emit(event, payload);
      return true;
    },
    [],
  );

  const runCommand = useCallback(
    (command: SessionCommand, event: string) => {
      if (pendingCommand) {
        return;
      }
      setPendingCommand(command);
      if (!emit(event, { sessionId })) {
        setPendingCommand(null);
      }
    },
    [emit, pendingCommand, sessionId],
  );

  return {
    isConnected,
    sessionState,
    participants,
    currentQuestion,
    leaderboard,
    answerStatus,
    answersCount,
    remainingSeconds,
    pendingCommand,
    error:
      error ||
      (!sessionId
        ? "Не указан идентификатор сессии"
        : !getStoredToken()
          ? "Требуется авторизация"
          : ""),
    startSession: () => runCommand("start", "organizer:session-start"),
    closeQuestion: () => runCommand("close", "organizer:question-close"),
    showAnswer: () => runCommand("show-answer", "organizer:show-answer"),
    nextQuestion: () => runCommand("next", "organizer:next-question"),
    finishSession: () => runCommand("finish", "organizer:session-finish"),
    submitAnswer: (questionId, selectedOptionIds) => {
      if (
        answerStatus.state === "pending" ||
        answerStatus.state === "accepted" ||
        answerStatus.state === "submitted" ||
        sessionState?.canAnswerCurrentQuestion === false
      ) {
        return;
      }
      setAnswerStatus({ state: "pending" });
      if (!emit("participant:submit-answer", {
        sessionId,
        questionId,
        selectedOptionIds,
      })) {
        setAnswerStatus({
          state: "rejected",
          reason: "Соединение с сервером ещё не установлено",
        });
      }
    },
  };
}
