import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { getQuizzes } from "@/api/quizApi";
import { QuizCard } from "@/components/quiz/QuizCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Quiz } from "@/types/quiz";

export function AllQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void getQuizzes()
      .then(setQuizzes)
      .catch((loadError) => setError(getErrorMessage(loadError)))
      .finally(() => setIsLoading(false));
  }, []);

  const handleQuizUpdated = (updatedQuiz: Quiz) => {
    setQuizzes((current) =>
      current.map((quiz) =>
        quiz.id === updatedQuiz.id ? updatedQuiz : quiz,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Все квизы
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Просматривайте все шаблоны квизов и управляйте ими.
          </p>
        </div>
        <Link to="/organizer/quizzes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Создать квиз
          </Button>
        </Link>
      </div>

      <Card>
        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Загрузка квизов...</p>
        ) : error ? (
          <p className="m-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : quizzes.length === 0 ? (
          <p className="p-10 text-center text-sm text-zinc-500">
            Квизов пока нет.
          </p>
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
