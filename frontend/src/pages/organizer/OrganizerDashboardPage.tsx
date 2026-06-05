import { Activity, LayoutList, Plus, Users } from "lucide-react";
import { Link } from "react-router";
import { QuizCard } from "@/components/quiz/QuizCard";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { mockQuizzes } from "@/data/mockQuizzes";

const summaryCards = [
  { label: "Total Quizzes", value: "12", icon: LayoutList },
  { label: "Completed Sessions", value: "48", icon: Activity },
  { label: "Total Participants", value: "1,204", icon: Users },
];

export function OrganizerDashboardPage() {
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
            Your most recently edited or created quiz sessions.
          </CardDescription>
        </CardHeader>
        <div className="divide-y divide-zinc-100">
          {mockQuizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      </Card>
    </div>
  );
}
