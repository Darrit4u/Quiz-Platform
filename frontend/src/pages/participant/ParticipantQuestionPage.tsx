import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AnswerOption } from "@/components/quiz/AnswerOption";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { Timer } from "@/components/quiz/Timer";
import { Button } from "@/components/ui/Button";
import { useSessionSocket } from "@/hooks/useSessionSocket";

export function ParticipantQuestionPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const {
    isConnected,
    sessionState,
    currentQuestion: question,
    answerStatus,
    remainingSeconds,
    error,
    submitAnswer,
  } = useSessionSocket(roomId);
  const [selection, setSelection] = useState<{
    questionId: string;
    answerIds: string[];
  }>({ questionId: "", answerIds: [] });
  const selectedAnswers =
    selection.questionId === question?.id ? selection.answerIds : [];
  const isAnswerSubmitted =
    answerStatus.state === "accepted" || answerStatus.state === "submitted";

  useEffect(() => {
    if (sessionState?.status === "FINISHED" && roomId) {
      navigate(`/results/${roomId}`, { state: { from: "participant" } });
    }
    if (sessionState?.status === "CANCELLED") {
      navigate("/participant/join", { replace: true });
    }
  }, [navigate, roomId, sessionState?.status]);

  const selectAnswer = (answerId: string) => {
    if (!question) {
      return;
    }
    setSelection({
      questionId: question.id,
      answerIds:
        question.type === "SINGLE_CHOICE"
          ? [answerId]
          : selectedAnswers.includes(answerId)
            ? selectedAnswers.filter((id) => id !== answerId)
            : [...selectedAnswers, answerId],
    });
  };

  if (
    isAnswerSubmitted &&
    sessionState?.status !== "SHOWING_ANSWER"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-violet-100">
            <Check className="h-12 w-12 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Ответ отправлен
          </h1>
          <p className="text-zinc-500">
            Ожидайте остальных участников и следующего действия организатора.
          </p>
        </div>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <div className="text-center">
          <p className="font-medium text-zinc-900">
            {error
              ? "Не удалось загрузить вопрос."
              : "Ожидание следующего вопроса..."}
          </p>
          {error && (
            <p className="mt-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <span className="text-sm font-medium text-zinc-500">
            Вопрос {sessionState?.currentQuestionIndex ?? question.orderIndex} из{" "}
            {sessionState?.totalQuestions ?? "?"}
          </span>
          <Timer seconds={remainingSeconds} />
        </div>

        <QuestionCard
          className="flex-1"
          imageUrl={question.imageUrl ?? undefined}
          question={question.text}
        >
          <div className="grid flex-1 grid-cols-2 gap-4">
            {question.options.map((answer) => (
              <AnswerOption
                correct={question.correctOptionIds?.includes(answer.id)}
                disabled={
                  isAnswerSubmitted ||
                  answerStatus.state === "pending" ||
                  !isConnected ||
                  sessionState?.canAnswerCurrentQuestion === false ||
                  sessionState?.status !== "QUESTION_ACTIVE"
                }
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
          disabled={
            selectedAnswers.length === 0 ||
            remainingSeconds === 0 ||
            answerStatus.state === "pending" ||
            !isConnected ||
            isAnswerSubmitted ||
            sessionState?.canAnswerCurrentQuestion === false ||
            sessionState?.status !== "QUESTION_ACTIVE"
          }
          onClick={() => submitAnswer(question.id, selectedAnswers)}
          size="lg"
        >
          {answerStatus.state === "pending"
            ? "Отправка..."
            : isAnswerSubmitted
              ? "Ответ отправлен"
              : "Отправить ответ"}
        </Button>
        {isAnswerSubmitted && (
          <p className="text-center text-sm font-medium text-green-700">
            Ваш ответ отправлен.
          </p>
        )}
        {sessionState?.canAnswerCurrentQuestion === false && (
          <p className="text-center text-sm font-medium text-amber-700">
            Вы подключились после начала этого вопроса. Ответить можно будет на
            следующий вопрос.
          </p>
        )}
        {answerStatus.state === "rejected" && (
          <p className="text-center text-sm text-red-600">
            {answerStatus.reason}
          </p>
        )}
        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}
        {sessionState?.status === "SHOWING_ANSWER" && question.explanation && (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            {question.explanation}
          </p>
        )}
      </div>
    </main>
  );
}
