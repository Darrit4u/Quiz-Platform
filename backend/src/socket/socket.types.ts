import type { AuthUser } from "../modules/users/user.types.js";

export interface SessionIdPayload {
  sessionId: string;
}

export interface SubmitAnswerPayload extends SessionIdPayload {
  questionId: string;
  selectedOptionIds: string[];
}

export interface SocketData {
  user: AuthUser;
}

export interface ClientToServerEvents {
  "session:join": (payload: SessionIdPayload) => void;
  "session:leave": (payload: SessionIdPayload) => void;
  "organizer:session-start": (payload: SessionIdPayload) => void;
  "organizer:question-close": (payload: SessionIdPayload) => void;
  "organizer:show-answer": (payload: SessionIdPayload) => void;
  "organizer:next-question": (payload: SessionIdPayload) => void;
  "organizer:session-finish": (payload: SessionIdPayload) => void;
  "participant:submit-answer": (payload: SubmitAnswerPayload) => void;
}

export interface ServerToClientEvents {
  "session:state-updated": (payload: unknown) => void;
  "session:participants-updated": (payload: unknown) => void;
  "answers:count-updated": (payload: unknown) => void;
  "quiz:question-started": (payload: unknown) => void;
  "quiz:question-closed": (payload: unknown) => void;
  "quiz:answer-shown": (payload: unknown) => void;
  "quiz:finished": (payload: unknown) => void;
  "participant:answer-accepted": (payload: unknown) => void;
  "participant:answer-rejected": (payload: unknown) => void;
  "leaderboard:updated": (payload: unknown) => void;
  error: (payload: { message: string; code?: number }) => void;
}
