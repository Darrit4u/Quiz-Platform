import type { Question } from "@/types/quiz";

export const mockQuestions: Question[] = [
  {
    id: "question-1",
    text: "Which architecture pattern separates the presentation layer from the business logic layer?",
    type: "single",
    timeLimit: 30,
    points: 1000,
    answers: [
      { id: "answer-1", text: "MVC (Model-View-Controller)", isCorrect: true },
      { id: "answer-2", text: "Singleton", isCorrect: false },
      { id: "answer-3", text: "Observer", isCorrect: false },
      { id: "answer-4", text: "Factory Method", isCorrect: false },
    ],
  },
  {
    id: "question-2",
    text: "Which HTTP methods are generally considered idempotent?",
    type: "multiple",
    timeLimit: 45,
    points: 1200,
    answers: [
      { id: "answer-5", text: "GET", isCorrect: true },
      { id: "answer-6", text: "PUT", isCorrect: true },
      { id: "answer-7", text: "POST", isCorrect: false },
      { id: "answer-8", text: "DELETE", isCorrect: true },
    ],
  },
];
