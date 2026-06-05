import { Ban, ChevronRight, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Timer } from "@/components/quiz/Timer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { mockQuestions } from "@/data/mockQuestions";
import { mockRoom } from "@/data/mockRooms";

export function HostQuizPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [seconds, setSeconds] = useState(30);
  const [submissionsOpen, setSubmissionsOpen] = useState(true);
  const question = mockQuestions[0];

  useEffect(() => {
    if (!submissionsOpen || seconds === 0) {
      return;
    }
    const timer = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [seconds, submissionsOpen]);

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Question 1 of 10</Badge>
            <span className="text-sm font-medium text-zinc-500">
              Q3 All-Hands Engineering Trivia
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Timer seconds={seconds} />
            <div className="h-6 w-px bg-zinc-200" />
            <p className="text-sm font-medium">
              <span className="font-bold text-zinc-900">4</span>
              <span className="text-zinc-500">
                {" "}
                / {mockRoom.participants.length} Answers
              </span>
            </p>
          </div>
        </div>

        <Card className="min-h-[55vh]">
          <CardContent className="flex min-h-[55vh] flex-col items-center justify-center space-y-12 p-12 text-center">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-zinc-900">
              {question.text}
            </h1>
            <div className="grid w-full max-w-3xl grid-cols-2 gap-4">
              {question.answers.map((answer) => (
                <div
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-xl font-medium text-zinc-700"
                  key={answer.id}
                >
                  {answer.text}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setSubmissionsOpen((value) => !value)}
            variant="outline"
          >
            <Ban className="mr-2 h-4 w-4" />
            {submissionsOpen ? "Close Submissions" : "Open Submissions"}
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="secondary">
              <SkipForward className="mr-2 h-4 w-4" />
              Skip
            </Button>
            <Button
              onClick={() =>
                navigate(`/results/${roomId ?? mockRoom.id}`, {
                  state: { from: "organizer" },
                })
              }
            >
              Show Results
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
