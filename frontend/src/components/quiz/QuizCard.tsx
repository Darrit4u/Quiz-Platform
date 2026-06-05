import { MoreHorizontal, Play, Settings2 } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Quiz } from "@/types/quiz";

interface QuizCardProps {
  quiz: Quiz;
}

export function QuizCard({ quiz }: QuizCardProps) {
  const isPublished = quiz.status === "published";

  return (
    <article className="flex items-center justify-between gap-4 p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900">{quiz.title}</h3>
          <Badge variant={isPublished ? "success" : "secondary"}>
            {isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>{quiz.questions.length} questions</span>
          <span aria-hidden="true">•</span>
          <span>Edited {quiz.lastEdited}</span>
          {quiz.sessionsCount > 0 && (
            <>
              <span aria-hidden="true">•</span>
              <span>{quiz.sessionsCount} sessions</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to={`/organizer/quizzes/${quiz.id}/questions`}>
          <Button size="sm" variant="outline">
            <Settings2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
        {isPublished && (
          <Link to={`/organizer/rooms/room-${quiz.id}/lobby`}>
            <Button size="sm">
              <Play className="mr-2 h-4 w-4" />
              Host
            </Button>
          </Link>
        )}
        <Button aria-label="More quiz actions" className="px-2" size="sm" variant="ghost">
          <MoreHorizontal className="h-4 w-4 text-zinc-500" />
        </Button>
      </div>
    </article>
  );
}
