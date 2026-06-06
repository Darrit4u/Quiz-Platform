import { CheckCircle2, User } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Card, CardContent } from "@/components/ui/Card";
import { useSessionSocket } from "@/hooks/useSessionSocket";

interface JoinState {
  participantName?: string;
}

export function ParticipantLobbyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const state = location.state as JoinState | null;
  const participantName = state?.participantName || "Участник";
  const { isConnected, sessionState, error } = useSessionSocket(roomId);

  useEffect(() => {
    if (sessionState?.status === "QUESTION_ACTIVE" && roomId) {
      navigate(`/participant/rooms/${roomId}/question`, {
        state: { participantName },
      });
    }
    if (sessionState?.status === "FINISHED" && roomId) {
      navigate(`/results/${roomId}`, { state: { from: "participant" } });
    }
    if (sessionState?.status === "CANCELLED") {
      navigate("/participant/join", { replace: true });
    }
  }, [navigate, participantName, roomId, sessionState?.status]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Вы подключились!
          </h1>
          <p className="mt-2 text-zinc-500">
            Ваше имя появилось на экране организатора.
          </p>
        </div>

        <Card className="bg-white/60">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-center gap-3 font-medium text-zinc-900">
              <User className="h-5 w-5 text-zinc-400" />
              <span>{participantName}</span>
            </div>
            <div className="h-px bg-zinc-100" />
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {sessionState?.quizTitle ?? "Загрузка квиза..."}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Комната {sessionState?.roomCode ?? "..."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 pt-8">
          {!error && (
            <div className="flex justify-center gap-2">
              {[0, 150, 300].map((delay) => (
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-violet-600"
                  key={delay}
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          )}
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            {isConnected
              ? "Ожидание запуска организатором..."
              : "Подключение..."}
          </p>
          {error && (
            <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
