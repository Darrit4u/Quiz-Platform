import type { QuestionType, ScoringMode } from "@/types/quiz";

export type SessionStatus =
  | "WAITING_FOR_PLAYERS"
  | "QUESTION_ACTIVE"
  | "QUESTION_CLOSED"
  | "SHOWING_ANSWER"
  | "FINISHED"
  | "CANCELLED";

export type SessionParticipantStatus =
  | "JOINED"
  | "LEFT"
  | "KICKED"
  | "FINISHED";

export interface SessionOption {
  id: string;
  text: string;
  imageUrl: string | null;
  orderIndex: number;
}

export interface SessionQuestion {
  id: string;
  text: string;
  imageUrl: string | null;
  type: QuestionType;
  timeLimitSec: number;
  points: number;
  orderIndex: number;
  options: SessionOption[];
  correctOptionIds?: string[];
  explanation?: string | null;
}

export interface SessionState {
  sessionId: string;
  status: SessionStatus;
  roomCode: string;
  quizTitle: string;
  currentQuestionId: string | null;
  currentQuestionStartedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  serverTime: string;
}

export interface SessionParticipant {
  participantId: string;
  displayName: string;
  score: number;
  status: SessionParticipantStatus;
}

export interface SessionLeaderboardEntry {
  place?: number;
  participantId: string;
  displayName: string;
  score: number;
  correctAnswersCount?: number;
  totalAnswersCount?: number;
  averageResponseTimeMs?: number | null;
}

export interface ApiSession {
  id: string;
  quizId: string;
  hostId: string;
  roomCode: string;
  status: SessionStatus;
  quizTitle?: string;
  createdAt: string;
  quiz?: {
    id: string;
    title: string;
    defaultTimeLimitSec?: number;
    scoringMode?: ScoringMode;
  };
}

export interface SessionLookup {
  id: string;
  roomCode: string;
  status: SessionStatus;
  participantCount: number;
  quiz: {
    id: string;
    title: string;
  };
  host: {
    id: string;
    name: string;
  };
}

export interface JoinedSession {
  participant: {
    id: string;
    displayName: string;
    score: number;
    status: SessionParticipantStatus;
  };
  session: {
    id: string;
    roomCode: string;
    status: SessionStatus;
    quiz: {
      id: string;
      title: string;
    };
  };
}

export interface SessionResults {
  session: {
    id: string;
    status: SessionStatus;
    finishedAt: string | null;
    quiz: {
      id: string;
      title: string;
    };
  };
  leaderboard: Array<{
    place: number;
    participantId: string;
    displayName: string;
    finalScore: number;
    correctAnswersCount: number;
    totalAnswersCount: number;
    averageResponseTimeMs: number | null;
  }>;
}

export type AnswerStatus =
  | { state: "idle" }
  | { state: "pending" }
  | {
      state: "accepted";
      isCorrect: boolean;
      scoreAwarded: number;
      currentScore: number;
    }
  | { state: "rejected"; reason: string };
