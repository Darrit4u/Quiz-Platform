import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AnswerOption } from "@/components/quiz/AnswerOption";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { Timer } from "@/components/quiz/Timer";
import { Button } from "@/components/ui/Button";
import { mockQuestions } from "@/data/mockQuestions";
import { mockRoom } from "@/data/mockRooms";

export function ParticipantQuestionPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const question = mockQuestions[0];
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(question.timeLimit);

  useEffect(() => {
    if (submitted || seconds === 0) {
      return;
    }
    const timer = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [seconds, submitted]);

  const selectAnswer = (answerId: string) => {
    setSelectedAnswers(
      question.type === "single"
        ? [answerId]
        : selectedAnswers.includes(answerId)
          ? selectedAnswers.filter((id) => id !== answerId)
          : [...selectedAnswers, answerId],
    );
  };

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-violet-100">
            <Check className="h-12 w-12 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Answer Submitted
          </h1>
          <p className="text-zinc-500">
            Waiting for other participants and the host to proceed...
          </p>
          <Button
            className="mt-12 text-zinc-400"
            onClick={() =>
              navigate(`/results/${roomId ?? mockRoom.id}`, {
                state: { from: "participant" },
              })
            }
            size="sm"
            variant="ghost"
          >
            Demo: Go to Results
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <span className="text-sm font-medium text-zinc-500">
            Question 1 of 10
          </span>
          <Timer seconds={seconds} />
        </div>

        <QuestionCard className="flex-1" question={question.text}>
          <div className="grid flex-1 grid-cols-2 gap-4">
            {question.answers.map((answer) => (
              <AnswerOption
                key={answer.id}
                onSelect={() => selectAnswer(answer.id)}
                selected={selectedAnswers.includes(answer.id)}
                text={answer.text}
              />
            ))}
          </div>
        </QuestionCard>

        <Button
          className="h-14 w-full text-lg"
          disabled={selectedAnswers.length === 0 || seconds === 0}
          onClick={() => setSubmitted(true)}
          size="lg"
        >
          Submit Answer
        </Button>
      </div>
    </main>
  );
}
