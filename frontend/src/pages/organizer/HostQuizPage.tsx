import { Ban, ChevronRight, SkipForward, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { cancelSession } from "@/api/sessionApi";
import { Timer } from "@/components/quiz/Timer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useSessionSocket } from "@/hooks/useSessionSocket";

export function HostQuizPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const {
    isConnected,
    sessionState,
    participants,
    currentQuestion: question,
    leaderboard,
    answersCount,
    remainingSeconds,
    error,
    pendingCommand,
    closeQuestion,
    showAnswer,
    nextQuestion,
    finishSession,
  } = useSessionSocket(roomId);

  useEffect(() => {
    if (sessionState?.status === "FINISHED" && roomId) {
      navigate(`/results/${roomId}`, { state: { from: "organizer" } });
    }
    if (sessionState?.status === "CANCELLED") {
      navigate("/organizer", { replace: true });
    }
  }, [navigate, roomId, sessionState?.status]);

  const handleCancel = async () => {
    if (!roomId || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setCancelError("");

    try {
      await cancelSession(roomId);
      navigate("/organizer", { replace: true });
    } catch (cancelFailure) {
      setCancelError(getErrorMessage(cancelFailure));
    } finally {
      setIsCancelling(false);
    }
  };

  if (!question) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <div className="text-center">
          <p className="font-medium text-zinc-900">
            {error
              ? "Не удалось загрузить текущий вопрос."
              : "Загрузка вопроса..."}
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
    <main className="min-h-screen bg-zinc-50 px-8 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              Вопрос {sessionState?.currentQuestionIndex ?? question.orderIndex} из{" "}
              {sessionState?.totalQuestions ?? "?"}
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
                / {participants.length} ответов
              </span>
            </p>
          </div>
        </div>

        <Card className="min-h-[55vh]">
          <CardContent className="flex min-h-[55vh] flex-col items-center justify-center space-y-12 p-12 text-center">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-zinc-900">
              {question.text}
            </h1>
            {question.imageUrl && (
              <img
                alt={question.text}
                className="max-h-72 max-w-full rounded-xl object-contain"
                src={question.imageUrl}
              />
            )}
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

        {(error || cancelError) && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {cancelError || error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Button
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={
              sessionState?.status !== "QUESTION_ACTIVE" ||
              pendingCommand !== null ||
              !isConnected
            }
            onClick={closeQuestion}
            variant="outline"
          >
            <Ban className="mr-2 h-4 w-4" />
            {pendingCommand === "close"
              ? "Закрытие..."
              : "Закрыть приём ответов"}
          </Button>
          <div className="flex items-center gap-3">
            <Button
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={
                isCancelling ||
                pendingCommand !== null ||
                !isConnected
              }
              onClick={() => setIsCancelModalOpen(true)}
              variant="outline"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Отменить сессию
            </Button>
            {sessionState?.status === "QUESTION_CLOSED" && (
              <Button
                disabled={pendingCommand !== null || !isConnected}
                onClick={showAnswer}
                variant="secondary"
              >
                {pendingCommand === "show-answer"
                  ? "Показ..."
                  : "Показать ответ"}
              </Button>
            )}
            <Button
              disabled={
                sessionState?.status !== "SHOWING_ANSWER" &&
                sessionState?.status !== "QUESTION_CLOSED" ||
                pendingCommand !== null ||
                !isConnected
              }
              onClick={nextQuestion}
              variant="secondary"
            >
              <SkipForward className="mr-2 h-4 w-4" />
              {pendingCommand === "next"
                ? "Загрузка..."
                : "Следующий вопрос"}
            </Button>
            <Button
              disabled={pendingCommand !== null || !isConnected}
              onClick={() => setIsFinishModalOpen(true)}
            >
              Завершить сессию
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {leaderboard.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Текущий рейтинг
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
      <Modal
        onClose={() => {
          if (!isCancelling) {
            setIsCancelModalOpen(false);
          }
        }}
        open={isCancelModalOpen}
        title="Отменить активную сессию?"
      >
        <p className="text-sm text-zinc-600">
          Квиз будет немедленно остановлен, итоговые результаты не будут
          сформированы.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            disabled={isCancelling}
            onClick={() => setIsCancelModalOpen(false)}
            variant="outline"
          >
            Продолжить квиз
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={isCancelling}
            onClick={handleCancel}
          >
            {isCancelling ? "Отмена..." : "Отменить сессию"}
          </Button>
        </div>
      </Modal>
      <Modal
        onClose={() => {
          if (pendingCommand !== "finish") {
            setIsFinishModalOpen(false);
          }
        }}
        open={isFinishModalOpen}
        title="Завершить сессию?"
      >
        <p className="text-sm text-zinc-600">
          Квиз завершится для всех участников, после чего будет сформирован
          итоговый рейтинг. Это действие нельзя отменить.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            disabled={pendingCommand === "finish"}
            onClick={() => setIsFinishModalOpen(false)}
            variant="outline"
          >
            Продолжить квиз
          </Button>
          <Button
            disabled={pendingCommand === "finish"}
            onClick={finishSession}
          >
            {pendingCommand === "finish"
              ? "Завершение..."
              : "Завершить сессию"}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
