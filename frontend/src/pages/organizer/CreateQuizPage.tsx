import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { createQuiz } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type {
  CreateQuizInput,
  QuizVisibility,
  ScoringMode,
} from "@/types/quiz";

interface QuizDraft {
  title: string;
  description: string;
  defaultTimeLimitSec: number;
  visibility: QuizVisibility;
  scoringMode: ScoringMode;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
}

export function CreateQuizPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<QuizDraft>({
    title: "",
    description: "",
    defaultTimeLimitSec: 30,
    visibility: "PRIVATE",
    scoringMode: "FIXED",
    shuffleQuestions: false,
    shuffleAnswers: false,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const payload: CreateQuizInput = {
      title: draft.title,
      description: draft.description.trim() || null,
      status: "DRAFT",
      visibility: draft.visibility,
      defaultTimeLimitSec: draft.defaultTimeLimitSec,
      scoringMode: draft.scoringMode,
      shuffleQuestions: draft.shuffleQuestions,
      shuffleAnswers: draft.shuffleAnswers,
    };

    try {
      const quiz = await createQuiz(payload);
      navigate(`/organizer/quizzes/${quiz.id}/questions`, { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          aria-label="Go back"
          className="px-2"
          onClick={() => navigate(-1)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-5 w-5 text-zinc-500" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Create New Quiz
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Set up the basic details for your quiz template.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-6 p-6">
            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Quiz Title</span>
              <Input
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                placeholder="e.g., Q3 All-Hands Engineering Trivia"
                required
                value={draft.title}
              />
            </label>

            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Description (Optional)</span>
              <textarea
                className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
                placeholder="Briefly describe what this quiz is about..."
                rows={3}
                value={draft.description}
              />
            </label>

            <div className="grid grid-cols-2 gap-6">
              <label className="block space-y-2 text-sm font-medium text-zinc-900">
                <span>Visibility</span>
                <select
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      visibility: event.target.value as QuizVisibility,
                    })
                  }
                  value={draft.visibility}
                >
                  <option value="PRIVATE">Private</option>
                  <option value="LINK_ONLY">Link only</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium text-zinc-900">
                <span>Default Time per Question (seconds)</span>
                <Input
                  min={5}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      defaultTimeLimitSec: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={draft.defaultTimeLimitSec}
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Scoring Mode</span>
              <select
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    scoringMode: event.target.value as ScoringMode,
                  })
                }
                value={draft.scoringMode}
              >
                <option value="FIXED">Fixed points</option>
                <option value="TIME_BASED">Time based</option>
              </select>
            </label>

            <fieldset className="space-y-3 border-t border-zinc-100 pt-4">
              <legend className="mb-3 text-sm font-medium text-zinc-900">
                Quiz Rules
              </legend>
              <label className="flex items-center gap-3 text-sm text-zinc-700">
                <input
                  checked={draft.shuffleQuestions}
                  className="h-4 w-4 rounded border-zinc-300 accent-violet-600"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      shuffleQuestions: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                Randomize question order
              </label>
              <label className="flex items-center gap-3 text-sm text-zinc-700">
                <input
                  checked={draft.shuffleAnswers}
                  className="h-4 w-4 rounded border-zinc-300 accent-violet-600"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      shuffleAnswers: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                Randomize answer order
              </label>
            </fieldset>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button disabled={isSubmitting} type="submit">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save & Add Questions"}
          </Button>
        </div>
      </form>
    </div>
  );
}
