import { EyeOff, Play, Settings2, Upload } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { updateQuiz } from "@/api/quizApi";
import { createSession } from "@/api/sessionApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/formatDate";
import type { Quiz } from "@/types/quiz";

interface QuizCardProps {
  quiz: Quiz;
  onQuizUpdated: (quiz: Quiz) => void;
}

const statusLabels = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликован",
  ARCHIVED: "В архиве",
} as const;

export function QuizCard({ quiz, onQuizUpdated }: QuizCardProps) {
  const isPublished = quiz.status === "PUBLISHED";
  const isEditingLocked = quiz.hasActiveSession === true;
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState("");

  const handleHost = async () => {
    setIsStarting(true);
    setError("");

    try {
      const session = await createSession(quiz.id);
      navigate(`/organizer/rooms/${session.id}/lobby`);
    } catch (hostError) {
      setError(getErrorMessage(hostError));
    } finally {
      setIsStarting(false);
    }
  };

  const handleStatusChange = async () => {
    setIsUpdatingStatus(true);
    setError("");

    try {
      const updatedQuiz = await updateQuiz(quiz.id, {
        status: isPublished ? "DRAFT" : "PUBLISHED",
      });
      onQuizUpdated({
        ...quiz,
        ...updatedQuiz,
        questionCount: quiz.questionCount,
        sessionCount: quiz.sessionCount,
      });
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <article className="flex items-center justify-between gap-4 p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900">{quiz.title}</h3>
          <Badge
            variant={
              isPublished
                ? "success"
                : quiz.status === "ARCHIVED"
                  ? "outline"
                  : "secondary"
            }
          >
            {statusLabels[quiz.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>
            Вопросов: {quiz.questionCount ?? quiz.questions?.length ?? 0}
          </span>
          <span aria-hidden="true">•</span>
          <span>Изменён {formatDate(quiz.updatedAt)}</span>
          {(quiz.sessionCount ?? 0) > 0 && (
            <>
              <span aria-hidden="true">•</span>
              <span>Сессий: {quiz.sessionCount}</span>
            </>
          )}
        </div>
        {isEditingLocked && (
          <p className="text-sm text-amber-700">
            Редактирование недоступно, пока активна сессия.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        {isEditingLocked ? (
          <Button disabled size="sm" variant="outline">
            <Settings2 className="mr-2 h-4 w-4" />
            Редактировать
          </Button>
        ) : (
          <Link to={`/organizer/quizzes/${quiz.id}/questions`}>
            <Button size="sm" variant="outline">
              <Settings2 className="mr-2 h-4 w-4" />
              Редактировать
            </Button>
          </Link>
        )}
        {quiz.status === "DRAFT" && (
          <Button
            disabled={isUpdatingStatus || isEditingLocked}
            onClick={handleStatusChange}
            size="sm"
            variant="secondary"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUpdatingStatus ? "Публикация..." : "Опубликовать"}
          </Button>
        )}
        {isPublished && (
          <>
            <Button
              disabled={isUpdatingStatus || isEditingLocked}
              onClick={handleStatusChange}
              size="sm"
              variant="outline"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              {isUpdatingStatus
                ? "Снятие с публикации..."
                : "Снять с публикации"}
            </Button>
            <Button disabled={isStarting} onClick={handleHost} size="sm">
              <Play className="mr-2 h-4 w-4" />
              {isStarting ? "Запуск..." : "Провести"}
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
