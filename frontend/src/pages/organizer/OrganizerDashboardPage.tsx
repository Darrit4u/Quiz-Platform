import { Activity, LayoutList, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { getQuizzes } from "@/api/quizApi";
import { getHostedSessions } from "@/api/sessionApi";
import { QuizCard } from "@/components/quiz/QuizCard";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { Quiz } from "@/types/quiz";
import type { HostedSession } from "@/types/session";

export function OrganizerDashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sessions, setSessions] = useState<HostedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [loadedQuizzes, loadedSessions] = await Promise.all([
          getQuizzes(),
          getHostedSessions(),
        ]);
        setQuizzes(loadedQuizzes);
        setSessions(loadedSessions);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const completedSessionCount = sessions.filter(
    (session) => session.status === "FINISHED",
  ).length;
  const participantCount = sessions.reduce(
    (total, session) => total + session.participantCount,
    0,
  );
  const handleQuizUpdated = (updatedQuiz: Quiz) => {
    setQuizzes((current) =>
      current.map((quiz) =>
        quiz.id === updatedQuiz.id ? updatedQuiz : quiz,
      ),
    );
  };
  const summaryCards = [
    {
      label: "Всего квизов",
      value: quizzes.length.toString(),
      icon: LayoutList,
    },
    {
      label: "Завершённых сессий",
      value: completedSessionCount.toString(),
      icon: Activity,
    },
    {
      label: "Всего участников",
      value: participantCount.toString(),
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Главная
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Управляйте квизами и просматривайте недавнюю активность.
          </p>
        </div>
        <Link to="/organizer/quizzes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Создать квиз
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {summaryCards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">
                {item.label}
              </CardTitle>
              <item.icon className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-zinc-950">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b border-zinc-100 pb-4">
          <CardTitle className="text-lg">Все квизы</CardTitle>
          <CardDescription>
            Шаблоны квизов, отсортированные по дате изменения.
          </CardDescription>
        </CardHeader>

        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Загрузка данных...</p>
        ) : error ? (
          <p className="m-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : quizzes.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-zinc-900">Квизов пока нет</p>
            <p className="mt-1 text-sm text-zinc-500">
              Создайте первый квиз, чтобы добавить вопросы.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                onQuizUpdated={handleQuizUpdated}
                quiz={quiz}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
