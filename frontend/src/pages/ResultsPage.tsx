import { ArrowLeft, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useParams } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { getSessionResults } from "@/api/sessionApi";
import { useAuth } from "@/auth/useAuth";
import { LeaderboardTable } from "@/components/quiz/LeaderboardTable";
import { Button } from "@/components/ui/Button";
import type { LeaderboardEntry } from "@/types/room";
import type { SessionStatus } from "@/types/session";

interface ResultsState {
  from?: "organizer" | "participant";
}

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [quizTitle, setQuizTitle] = useState("Квиз");
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(roomId));
  const [error, setError] = useState("");
  const state = location.state as ResultsState | null;
  const isParticipant =
    state?.from === "participant" || user?.role === "PARTICIPANT";
  const destination = isParticipant ? "/participant/join" : "/organizer";
  const destinationLabel = isParticipant
    ? "Присоединиться к другому квизу"
    : "Вернуться на главную";

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const loadResults = async () => {
      setIsLoading(true);
      setError("");
      setEntries([]);
      setSessionStatus(null);
      try {
        const result = await getSessionResults(roomId);
        setQuizTitle(result.session.quiz.title);
        setSessionStatus(result.session.status);
        setEntries(
          result.leaderboard.map((entry) => ({
            id: entry.participantId,
            name: entry.displayName,
            score: entry.finalScore,
            correctAnswers: entry.correctAnswersCount,
            rank: entry.place,
            totalQuestions: entry.totalAnswersCount,
          })),
        );
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    };

    void loadResults();
  }, [roomId]);

  const displayError =
    error || (!roomId ? "Не указан идентификатор сессии" : "");

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <Button
            className="text-zinc-500"
            onClick={() => navigate(destination)}
            variant="ghost"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {destinationLabel}
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Итоговые результаты
          </h1>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100">
            <Trophy className="h-12 w-12 text-yellow-600" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900">
            {sessionStatus === "FINISHED"
              ? "Сессия завершена"
              : sessionStatus === "CANCELLED"
                ? "Сессия отменена"
                : "Результаты квиза"}
          </h2>
          <p className="text-lg font-medium text-zinc-500">
            {quizTitle}
          </p>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-zinc-500">
            Загрузка результатов...
          </p>
        ) : displayError ? (
          <p className="rounded-md bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {displayError}
          </p>
        ) : sessionStatus === "CANCELLED" ? (
          <p className="text-center text-sm text-zinc-500">
            Эта сессия была отменена.
          </p>
        ) : sessionStatus !== "FINISHED" ? (
          <p className="text-center text-sm text-zinc-500">
            Результаты появятся после завершения квиза.
          </p>
        ) : entries.length > 0 ? (
          <LeaderboardTable entries={entries} />
        ) : (
          <p className="text-center text-sm text-zinc-500">
            Результатов пока нет.
          </p>
        )}

        <div className="flex justify-center pt-6">
          <Button onClick={() => navigate(destination)} size="lg">
            {destinationLabel}
          </Button>
        </div>
      </div>
    </main>
  );
}
