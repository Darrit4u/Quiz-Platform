import { httpClient } from "@/api/httpClient";
import type {
  ApiSession,
  JoinedSession,
  SessionLookup,
  SessionResults,
} from "@/types/session";

export async function createSession(quizId: string) {
  const response = await httpClient<{ session: ApiSession }>(
    `/quizzes/${quizId}/sessions`,
    { method: "POST" },
  );
  return response.session;
}

export async function getSessionByCode(roomCode: string) {
  const response = await httpClient<{ session: SessionLookup }>(
    `/sessions/code/${encodeURIComponent(roomCode)}`,
  );
  return response.session;
}

export async function joinSession(roomCode: string, displayName: string) {
  return httpClient<JoinedSession>(
    `/sessions/code/${encodeURIComponent(roomCode)}/join`,
    {
      method: "POST",
      body: JSON.stringify({ displayName }),
    },
  );
}

export async function getSessionResults(sessionId: string) {
  return httpClient<SessionResults>(`/sessions/${sessionId}/results`);
}
