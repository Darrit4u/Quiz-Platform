import { Ban, ChevronRight, SkipForward } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Timer } from "@/components/quiz/Timer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useSessionSocket } from "@/hooks/useSessionSocket";

export function HostQuizPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const {
    sessionState,
    participants,
    currentQuestion: question,
    leaderboard,
    answersCount,
    remainingSeconds,
    error,
    closeQuestion,
    showAnswer,
    nextQuestion,
    finishSession,
  } = useSessionSocket(roomId);

  useEffect(() => {
    if (sessionState?.status === "FINISHED" && roomId) {
      navigate(`/results/${roomId}`, { state: { from: "organizer" } });
    }
  }, [navigate, roomId, sessionState?.status]);

  if (!question) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <div className="text-center">
          <p className="font-medium text-zinc-900">Loading live question...</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              Question {question.orderIndex + 1}
            </Badge>
            <span className="text-sm font-medium text-zinc-500">
              {sessionState?.quizTitle}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Timer seconds={remainingSeconds} />
            <div className="h-6 w-px bg-zinc-200" />
            <p className="text-sm font-medium">
              <span className="font-bold text-zinc-900">{answersCount}</span>
              <span className="text-zinc-500">
                {" "}
                / {participants.length} Answers
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
              {question.options.map((answer) => (
                <div
                  className={
                    question.correctOptionIds?.includes(answer.id)
                      ? "rounded-xl border border-green-300 bg-green-50 p-6 text-xl font-medium text-green-800"
                      : "rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-xl font-medium text-zinc-700"
                  }
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
            disabled={sessionState?.status !== "QUESTION_ACTIVE"}
            onClick={closeQuestion}
            variant="outline"
          >
            <Ban className="mr-2 h-4 w-4" />
            Close Submissions
          </Button>
          <div className="flex items-center gap-3">
            {sessionState?.status === "QUESTION_CLOSED" && (
              <Button onClick={showAnswer} variant="secondary">
                Show Answer
              </Button>
            )}
            <Button
              disabled={
                sessionState?.status !== "SHOWING_ANSWER" &&
                sessionState?.status !== "QUESTION_CLOSED"
              }
              onClick={nextQuestion}
              variant="secondary"
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Next Question
            </Button>
            <Button onClick={finishSession}>
              Finish Session
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {leaderboard.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Live Leaderboard
              </h2>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3"
                    key={entry.participantId}
                  >
                    <span className="font-medium text-zinc-800">
                      {entry.place ?? index + 1}. {entry.displayName}
                    </span>
                    <span className="font-mono font-bold text-violet-700">
                      {entry.score}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
