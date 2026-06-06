import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { getHostedSessions } from "@/api/sessionApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/formatDate";
import type { HostedSession, SessionStatus } from "@/types/session";

const statusLabels: Record<SessionStatus, string> = {
  WAITING_FOR_PLAYERS: "Ожидание",
  QUESTION_ACTIVE: "Идёт",
  QUESTION_CLOSED: "Приём ответов закрыт",
  SHOWING_ANSWER: "Показ ответа",
  FINISHED: "Завершена",
  CANCELLED: "Отменена",
};

export function SessionHistoryPage() {
  const [sessions, setSessions] = useState<HostedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void getHostedSessions()
      .then(setSessions)
      .catch((loadError) => setError(getErrorMessage(loadError)))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          История сессий
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Все сессии, проведённые с вашего аккаунта.
        </p>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Загрузка сессий...</p>
        ) : error ? (
          <p className="m-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : sessions.length === 0 ? (
          <p className="p-10 text-center text-sm text-zinc-500">
            Проведённых сессий пока нет.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-medium">Квиз</th>
                <th className="px-6 py-4 font-medium">Комната</th>
                <th className="px-6 py-4 font-medium">Дата</th>
                <th className="px-6 py-4 text-center font-medium">
                  Участники
                </th>
                <th className="px-6 py-4 font-medium">Статус</th>
                <th className="px-6 py-4 text-right font-medium">Результаты</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    {session.quiz.title}
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-600">
                    {session.roomCode}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatDateTime(session.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-center text-zinc-700">
                    {session.participantCount}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        session.status === "FINISHED"
                          ? "success"
                          : session.status === "CANCELLED"
                            ? "outline"
                            : "warning"
                      }
                    >
                      {statusLabels[session.status]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {session.status === "FINISHED" ? (
                      <Link to={`/results/${session.id}`}>
                        <Button size="sm" variant="outline">
                          Открыть
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-zinc-400">Недоступны</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
