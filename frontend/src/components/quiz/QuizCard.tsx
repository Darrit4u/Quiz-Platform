import { MoreHorizontal, Play, Settings2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useNavigate } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { createSession } from "@/api/sessionApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Quiz } from "@/types/quiz";

interface QuizCardProps {
  quiz: Quiz;
}

const statusLabels = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
} as const;

export function QuizCard({ quiz }: QuizCardProps) {
  const isPublished = quiz.status === "PUBLISHED";
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
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
        {isPublished && (
          <Button disabled={isStarting} onClick={handleHost} size="sm">
            <Play className="mr-2 h-4 w-4" />
            {isStarting ? "Starting..." : "Host"}
          </Button>
        )}
        <Button
          aria-label="More quiz actions"
          className="px-2"
          size="sm"
          variant="ghost"
        >
          <MoreHorizontal className="h-4 w-4 text-zinc-500" />
        </Button>
      </div>
    </article>
  );
}
