import { Activity, LayoutList, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { getQuizzes } from "@/api/quizApi";
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

export function OrganizerDashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        setQuizzes(await getQuizzes());
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    };

    void loadQuizzes();
  }, []);

  const sessionCount = quizzes.reduce(
    (total, quiz) => total + (quiz.sessionCount ?? 0),
    0,
  );
  const summaryCards = [
    { label: "Total Quizzes", value: quizzes.length.toString(), icon: LayoutList },
    {
      label: "Completed Sessions",
      value: sessionCount.toString(),
      icon: Activity,
    },
    { label: "Total Participants", value: "—", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your quizzes and view recent activity.
          </p>
        </div>
        <Link to="/organizer/quizzes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Quiz
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
          <CardTitle className="text-lg">Recent Quizzes</CardTitle>
          <CardDescription>
            Your most recently edited or created quiz templates.
          </CardDescription>
        </CardHeader>

        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Loading quizzes...</p>
        ) : error ? (
          <p className="m-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : quizzes.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-zinc-900">No quizzes yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Create your first quiz to start adding questions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
