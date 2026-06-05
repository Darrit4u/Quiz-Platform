import {
  ArrowLeft,
  Check,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import {
  createQuestion,
  getQuiz,
  updateQuestion as updateQuestionRequest,
  updateQuiz,
} from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type {
  AnswerOption,
  Question,
  QuestionInput,
  QuestionType,
  Quiz,
} from "@/types/quiz";

const NEW_QUESTION_PREFIX = "new-question-";

function createDraftQuestion(orderIndex: number, timeLimitSec = 30): Question {
  const timestamp = Date.now();

  return {
    id: `${NEW_QUESTION_PREFIX}${timestamp}`,
    text: "New question",
    imageUrl: null,
    type: "SINGLE_CHOICE",
    timeLimitSec,
    points: 1000,
    orderIndex,
    explanation: null,
    answerOptions: [
      {
        id: `new-answer-${timestamp}-1`,
        text: "Option 1",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 1,
      },
      {
        id: `new-answer-${timestamp}-2`,
        text: "Option 2",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 2,
      },
    ],
  };
}

function validateQuestion(question: Question) {
  if (!question.text.trim()) {
    return "Question text is required";
  }

  if (question.answerOptions.length < 2) {
    return "A question must have at least two answer options";
  }

  if (question.answerOptions.some((option) => !option.text.trim())) {
    return "Every answer option must contain text";
  }

  const correctCount = question.answerOptions.filter(
    (option) => option.isCorrect,
  ).length;

  if (question.type === "SINGLE_CHOICE" && correctCount !== 1) {
    return "Single-choice questions must have exactly one correct answer";
  }

  if (question.type === "MULTIPLE_CHOICE" && correctCount < 1) {
    return "Multiple-choice questions must have at least one correct answer";
  }

  return null;
}

function toQuestionInput(question: Question): QuestionInput {
  return {
    text: question.text.trim(),
    imageUrl: question.imageUrl?.trim() || null,
    type: question.type,
    timeLimitSec: question.timeLimitSec,
    points: question.points,
    orderIndex: question.orderIndex,
    explanation: question.explanation?.trim() || null,
    options: question.answerOptions.map((option, index) => ({
      text: option.text.trim(),
      imageUrl: option.imageUrl?.trim() || null,
      isCorrect: option.isCorrect,
      orderIndex: index + 1,
    })),
  };
}

export function QuestionEditorPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const question = questions[activeIndex];

  useEffect(() => {
    const loadQuiz = async () => {
      if (!quizId) {
        setError("Quiz ID is missing");
        setIsLoading(false);
        return;
      }

      try {
        const loadedQuiz = await getQuiz(quizId);
        const loadedQuestions = loadedQuiz.questions ?? [];
        setQuiz(loadedQuiz);
        setQuestions(
          loadedQuestions.length > 0
            ? loadedQuestions
            : [createDraftQuestion(1, loadedQuiz.defaultTimeLimitSec)],
        );
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    };

    void loadQuiz();
  }, [quizId]);

  const updateCurrentQuestion = (patch: Partial<Question>) => {
    setSaved(false);
    setError("");
    setQuestions((current) =>
      current.map((item, index) =>
        index === activeIndex ? { ...item, ...patch } : item,
      ),
    );
  };

  const updateAnswer = (answerId: string, patch: Partial<AnswerOption>) => {
    if (!question) {
      return;
    }

    updateCurrentQuestion({
      answerOptions: question.answerOptions.map((answer) =>
        answer.id === answerId ? { ...answer, ...patch } : answer,
      ),
    });
  };

  const selectCorrectAnswer = (answerId: string) => {
    if (!question) {
      return;
    }

    updateCurrentQuestion({
      answerOptions: question.answerOptions.map((answer) => ({
        ...answer,
        isCorrect:
          question.type === "SINGLE_CHOICE"
            ? answer.id === answerId
            : answer.id === answerId
              ? !answer.isCorrect
              : answer.isCorrect,
      })),
    });
  };

  const changeType = (type: QuestionType) => {
    if (!question) {
      return;
    }

    const firstCorrectId =
      question.answerOptions.find((answer) => answer.isCorrect)?.id ??
      question.answerOptions[0]?.id;

    updateCurrentQuestion({
      type,
      answerOptions:
        type === "SINGLE_CHOICE"
          ? question.answerOptions.map((answer) => ({
              ...answer,
              isCorrect: answer.id === firstCorrectId,
            }))
          : question.answerOptions,
    });
  };

  const addAnswer = () => {
    if (!question) {
      return;
    }

    const nextIndex = question.answerOptions.length + 1;
    const newAnswer: AnswerOption = {
      id: `new-answer-${Date.now()}`,
      text: "",
      imageUrl: null,
      isCorrect: false,
      orderIndex: nextIndex,
    };
    updateCurrentQuestion({
      answerOptions: [...question.answerOptions, newAnswer],
    });
  };

  const deleteAnswer = (answerId: string) => {
    if (!question || question.answerOptions.length <= 2) {
      return;
    }

    updateCurrentQuestion({
      answerOptions: question.answerOptions.filter(
        (answer) => answer.id !== answerId,
      ),
    });
  };

  const addQuestion = () => {
    const newQuestion = createDraftQuestion(
      questions.length + 1,
      quiz?.defaultTimeLimitSec,
    );
    setQuestions((current) => [...current, newQuestion]);
    setActiveIndex(questions.length);
    setSaved(false);
    setError("");
  };

  const persistQuestion = async (draftQuestion: Question) => {
    if (!quizId) {
      throw new Error("Quiz ID is missing");
    }

    const input = toQuestionInput(draftQuestion);
    return draftQuestion.id.startsWith(NEW_QUESTION_PREFIX)
      ? createQuestion(quizId, input)
      : updateQuestionRequest(quizId, draftQuestion.id, input);
  };

  const saveQuestion = async () => {
    if (!quizId || !question) {
      return;
    }

    const validationError = validateQuestion(question);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const savedQuestion = await persistQuestion(question);

      setQuestions((current) =>
        current.map((item, index) =>
          index === activeIndex ? savedQuestion : item,
        ),
      );
      setSaved(true);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const publishQuiz = async () => {
    if (!quizId) {
      return;
    }

    for (const [index, draftQuestion] of questions.entries()) {
      const validationError = validateQuestion(draftQuestion);
      if (validationError) {
        setActiveIndex(index);
        setError(`Question ${index + 1}: ${validationError}`);
        return;
      }
    }

    setError("");
    setIsPublishing(true);

    try {
      const persistedQuestions = [...questions];

      for (const [index, draftQuestion] of questions.entries()) {
        persistedQuestions[index] = await persistQuestion(draftQuestion);
        setQuestions([...persistedQuestions]);
      }

      const updatedQuiz = await updateQuiz(quizId, {
        status: "PUBLISHED",
      });
      setQuiz((current) =>
        current
          ? {
              ...current,
              ...updatedQuiz,
              questions: persistedQuestions,
            }
          : current,
      );
      navigate("/organizer", { replace: true });
    } catch (publishError) {
      setError(getErrorMessage(publishError));
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading quiz...</p>;
  }

  if (!quiz || !question) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || "Quiz could not be loaded"}
      </div>
    );
  }

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
              {quiz.title}
            </h1>
            <p className="text-sm text-zinc-500">
              Editing question {activeIndex + 1} of {questions.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {quiz.status === "DRAFT" && (
            <Button
              disabled={isSaving || isPublishing}
              onClick={publishQuiz}
              variant="secondary"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isPublishing ? "Publishing..." : "Publish Quiz"}
            </Button>
          )}
          <Button
            disabled={isSaving || isPublishing}
            onClick={saveQuestion}
          >
            {saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? "Saving..." : saved ? "Saved" : "Save Question"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

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
                  onClick={() => {
                    setActiveIndex(index);
                    setSaved(false);
                    setError("");
                  }}
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
                  updateCurrentQuestion({ text: event.target.value })
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
                    updateCurrentQuestion({ imageUrl: event.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                  type="url"
                  value={question.imageUrl ?? ""}
                />
              </div>
            </label>

            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Explanation (Optional)</span>
              <textarea
                className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                onChange={(event) =>
                  updateCurrentQuestion({ explanation: event.target.value })
                }
                placeholder="Shown after the question is completed."
                rows={2}
                value={question.explanation ?? ""}
              />
            </label>

            <div className="space-y-4 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-900">
                  Answer Options
                </p>
                <span className="text-xs text-zinc-500">
                  Select correct answer
                  {question.type === "MULTIPLE_CHOICE" ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {question.answerOptions.map((answer) => (
                  <div className="group flex items-center gap-3" key={answer.id}>
                    <GripVertical className="h-4 w-4 text-zinc-300" />
                    <input
                      checked={answer.isCorrect}
                      className="h-4 w-4 accent-violet-600"
                      name={
                        question.type === "SINGLE_CHOICE"
                          ? `correct-${question.id}`
                          : undefined
                      }
                      onChange={() => selectCorrectAnswer(answer.id)}
                      type={
                        question.type === "SINGLE_CHOICE"
                          ? "radio"
                          : "checkbox"
                      }
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
                      disabled={question.answerOptions.length <= 2}
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
                <option value="SINGLE_CHOICE">Single Choice</option>
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium text-zinc-900">
              <span>Points</span>
              <Input
                className="h-9"
                min={1}
                onChange={(event) =>
                  updateCurrentQuestion({
                    points: Number(event.target.value),
                  })
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
                  updateCurrentQuestion({
                    timeLimitSec: Number(event.target.value),
                  })
                }
                value={question.timeLimitSec ?? quiz.defaultTimeLimitSec}
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
