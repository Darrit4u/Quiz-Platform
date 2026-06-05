import {
  ArrowLeft,
  Check,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { mockQuestions } from "@/data/mockQuestions";
import { cn } from "@/lib/cn";
import type { Answer, Question, QuestionType } from "@/types/quiz";

function cloneQuestion(question: Question): Question {
  return {
    ...question,
    answers: question.answers.map((answer) => ({ ...answer })),
  };
}

export function QuestionEditorPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [questions, setQuestions] = useState<Question[]>(() =>
    mockQuestions.map(cloneQuestion),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const question = questions[activeIndex];

  const updateQuestion = (patch: Partial<Question>) => {
    setSaved(false);
    setQuestions((current) =>
      current.map((item, index) =>
        index === activeIndex ? { ...item, ...patch } : item,
      ),
    );
  };

  const updateAnswer = (answerId: string, patch: Partial<Answer>) => {
    updateQuestion({
      answers: question.answers.map((answer) =>
        answer.id === answerId ? { ...answer, ...patch } : answer,
      ),
    });
  };

  const selectCorrectAnswer = (answerId: string) => {
    updateQuestion({
      answers: question.answers.map((answer) => ({
        ...answer,
        isCorrect:
          question.type === "single"
            ? answer.id === answerId
            : answer.id === answerId
              ? !answer.isCorrect
              : answer.isCorrect,
      })),
    });
  };

  const changeType = (type: QuestionType) => {
    const firstCorrectId =
      question.answers.find((answer) => answer.isCorrect)?.id ??
      question.answers[0]?.id;
    updateQuestion({
      type,
      answers:
        type === "single"
          ? question.answers.map((answer) => ({
              ...answer,
              isCorrect: answer.id === firstCorrectId,
            }))
          : question.answers,
    });
  };

  const addAnswer = () => {
    const newAnswer: Answer = {
      id: `answer-${Date.now()}`,
      text: "",
      isCorrect: false,
    };
    updateQuestion({ answers: [...question.answers, newAnswer] });
  };

  const deleteAnswer = (answerId: string) => {
    if (question.answers.length <= 2) {
      return;
    }
    updateQuestion({
      answers: question.answers.filter((answer) => answer.id !== answerId),
    });
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `question-${Date.now()}`,
      text: "New question",
      type: "single",
      timeLimit: 30,
      points: 1000,
      answers: [
        { id: `answer-${Date.now()}-1`, text: "Option 1", isCorrect: true },
        { id: `answer-${Date.now()}-2`, text: "Option 2", isCorrect: false },
      ],
    };
    setQuestions((current) => [...current, newQuestion]);
    setActiveIndex(questions.length);
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
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
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              Q3 All-Hands Engineering Trivia
            </h1>
            <p className="text-sm text-zinc-500">
              Quiz {quizId} · Editing question {activeIndex + 1} of{" "}
              {questions.length}
            </p>
          </div>
        </div>
        <Button onClick={() => setSaved(true)}>
          {saved ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saved ? "Saved" : "Save Question"}
        </Button>
      </div>

      <div className="grid grid-cols-[220px_minmax(0,1fr)_260px] gap-6">
        <Card className="h-fit">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">Questions</p>
              <Button
                aria-label="Add question"
                className="px-2"
                onClick={addQuestion}
                size="sm"
                variant="ghost"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {questions.map((item, index) => (
                <button
                  className={cn(
                    "w-full rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                    activeIndex === index
                      ? "border-violet-500 bg-violet-50 text-violet-800"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                  )}
                  key={item.id}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                >
                  <span className="block text-xs font-medium text-zinc-400">
                    Question {index + 1}
                  </span>
                  <span className="mt-1 block truncate">{item.text}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6 p-6">
            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Question Text</span>
              <textarea
                className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                onChange={(event) =>
                  updateQuestion({ text: event.target.value })
                }
                rows={3}
                value={question.text}
              />
            </label>

            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Image URL (Optional)</span>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  className="pl-9"
                  onChange={(event) =>
                    updateQuestion({ imageUrl: event.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                  type="url"
                  value={question.imageUrl ?? ""}
                />
              </div>
            </label>

            <div className="space-y-4 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-900">
                  Answer Options
                </p>
                <span className="text-xs text-zinc-500">
                  Select correct answer{question.type === "multiple" ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {question.answers.map((answer) => (
                  <div className="group flex items-center gap-3" key={answer.id}>
                    <GripVertical className="h-4 w-4 text-zinc-300" />
                    <input
                      checked={answer.isCorrect}
                      className="h-4 w-4 accent-violet-600"
                      name={
                        question.type === "single"
                          ? `correct-${question.id}`
                          : undefined
                      }
                      onChange={() => selectCorrectAnswer(answer.id)}
                      type={question.type === "single" ? "radio" : "checkbox"}
                    />
                    <Input
                      className="flex-1"
                      onChange={(event) =>
                        updateAnswer(answer.id, { text: event.target.value })
                      }
                      placeholder="Answer option"
                      value={answer.text}
                    />
                    <Button
                      aria-label="Delete answer"
                      className="px-2 text-zinc-400 opacity-0 group-hover:opacity-100"
                      disabled={question.answers.length <= 2}
                      onClick={() => deleteAnswer(answer.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                className="w-full border-dashed border-2"
                onClick={addAnswer}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="space-y-4 p-5">
            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Question Type</span>
              <select
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                onChange={(event) =>
                  changeType(event.target.value as QuestionType)
                }
                value={question.type}
              >
                <option value="single">Single Choice</option>
                <option value="multiple">Multiple Choice</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Points</span>
              <Input
                className="h-9"
                min={0}
                onChange={(event) =>
                  updateQuestion({ points: Number(event.target.value) })
                }
                type="number"
                value={question.points}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Time Limit (seconds)</span>
              <select
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                onChange={(event) =>
                  updateQuestion({ timeLimit: Number(event.target.value) })
                }
                value={question.timeLimit}
              >
                <option value={20}>20 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
              </select>
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
