import { mockQuestions } from "@/data/mockQuestions";
import type { Quiz } from "@/types/quiz";

export const mockQuizzes: Quiz[] = [
  {
    id: "quiz-1",
    title: "Q3 All-Hands Engineering Trivia",
    description: "A team knowledge check for the quarterly engineering meeting.",
    category: "Corporate Training",
    status: "draft",
    questions: mockQuestions,
    lastEdited: "2 hours ago",
    sessionsCount: 0,
  },
  {
    id: "quiz-2",
    title: "Onboarding: Company Values",
    description: "An introduction to company culture and working principles.",
    category: "Onboarding",
    status: "published",
    questions: mockQuestions.slice(0, 1),
    lastEdited: "1 day ago",
    sessionsCount: 12,
  },
  {
    id: "quiz-3",
    title: "Design System Knowledge Check",
    description: "Review core design system practices.",
    category: "Corporate Training",
    status: "published",
    questions: mockQuestions,
    lastEdited: "3 days ago",
    sessionsCount: 4,
  },
];
