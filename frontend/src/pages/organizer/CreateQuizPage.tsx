import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface QuizDraft {
  title: string;
  description: string;
  category: string;
  timeLimit: number;
  randomizeQuestions: boolean;
  showCorrectAnswer: boolean;
}

export function CreateQuizPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<QuizDraft>({
    title: "",
    description: "",
    category: "training",
    timeLimit: 30,
    randomizeQuestions: true,
    showCorrectAnswer: false,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate("/organizer/quizzes/quiz-new/questions");
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
            Set up the basic details for your quiz session.
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
                <span>Category</span>
                <select
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  onChange={(event) =>
                    setDraft({ ...draft, category: event.target.value })
                  }
                  value={draft.category}
                >
                  <option value="training">Corporate Training</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="teambuilding">Team Building</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium text-zinc-900">
                <span>Default Time per Question (seconds)</span>
                <Input
                  min={5}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      timeLimit: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={draft.timeLimit}
                />
              </label>
            </div>

            <fieldset className="space-y-3 border-t border-zinc-100 pt-4">
              <legend className="mb-3 text-sm font-medium text-zinc-900">
                Quiz Rules
              </legend>
              <label className="flex items-center gap-3 text-sm text-zinc-700">
                <input
                  checked={draft.randomizeQuestions}
                  className="h-4 w-4 rounded border-zinc-300 accent-violet-600"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      randomizeQuestions: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                Randomize question order
              </label>
              <label className="flex items-center gap-3 text-sm text-zinc-700">
                <input
                  checked={draft.showCorrectAnswer}
                  className="h-4 w-4 rounded border-zinc-300 accent-violet-600"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      showCorrectAnswer: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                Show correct answer after each question
              </label>
            </fieldset>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save &amp; Add Questions
          </Button>
        </div>
      </form>
    </div>
  );
}
