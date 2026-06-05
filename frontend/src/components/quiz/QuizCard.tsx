import { EyeOff, Play, Settings2, Upload } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { updateQuiz } from "@/api/quizApi";
import { createSession } from "@/api/sessionApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Quiz } from "@/types/quiz";

interface QuizCardProps {
  quiz: Quiz;
  onQuizUpdated: (quiz: Quiz) => void;
}

const statusLabels = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
} as const;

export function QuizCard({ quiz, onQuizUpdated }: QuizCardProps) {
  const isPublished = quiz.status === "PUBLISHED";
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
          <span>{quiz.questionCount ?? quiz.questions?.length ?? 0} questions</span>
          <span aria-hidden="true">•</span>
          <span>Updated {new Date(quiz.updatedAt).toLocaleDateString()}</span>
          {(quiz.sessionCount ?? 0) > 0 && (
            <>
              <span aria-hidden="true">•</span>
              <span>{quiz.sessionCount} sessions</span>
            </>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Link to={`/organizer/quizzes/${quiz.id}/questions`}>
          <Button size="sm" variant="outline">
            <Settings2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
        {quiz.status === "DRAFT" && (
          <Button
            disabled={isUpdatingStatus}
            onClick={handleStatusChange}
            size="sm"
            variant="secondary"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUpdatingStatus ? "Publishing..." : "Publish"}
          </Button>
        )}
        {isPublished && (
          <>
            <Button
              disabled={isUpdatingStatus}
              onClick={handleStatusChange}
              size="sm"
              variant="outline"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              {isUpdatingStatus ? "Unpublishing..." : "Unpublish"}
            </Button>
            <Button disabled={isStarting} onClick={handleHost} size="sm">
              <Play className="mr-2 h-4 w-4" />
              {isStarting ? "Starting..." : "Host"}
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
