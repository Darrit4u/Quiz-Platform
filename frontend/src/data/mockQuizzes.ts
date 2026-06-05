import { mockQuestions } from "@/data/mockQuestions";
import type { Quiz } from "@/types/quiz";

const now = new Date().toISOString();

export const mockQuizzes: Quiz[] = [
  {
    id: "quiz-1",
    creatorId: "organizer-1",
    categoryId: null,
    title: "Q3 All-Hands Engineering Trivia",
    description: "A team knowledge check for the quarterly engineering meeting.",
    status: "DRAFT",
    visibility: "PRIVATE",
    defaultTimeLimitSec: 30,
    scoringMode: "FIXED",
    shuffleQuestions: false,
    shuffleAnswers: false,
    createdAt: now,
    updatedAt: now,
    questions: mockQuestions,
    questionCount: mockQuestions.length,
    sessionCount: 0,
  },
];
