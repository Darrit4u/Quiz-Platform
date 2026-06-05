import type { Question } from "@/types/quiz";

export const mockQuestions: Question[] = [
  {
    id: "question-1",
    text: "Which architecture pattern separates the presentation layer from the business logic layer?",
    imageUrl: null,
    type: "SINGLE_CHOICE",
    timeLimitSec: 30,
    points: 1000,
    orderIndex: 1,
    explanation: null,
    answerOptions: [
      {
        id: "answer-1",
        text: "MVC (Model-View-Controller)",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 1,
      },
      {
        id: "answer-2",
        text: "Singleton",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 2,
      },
      {
        id: "answer-3",
        text: "Observer",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 3,
      },
      {
        id: "answer-4",
        text: "Factory Method",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 4,
      },
    ],
  },
  {
    id: "question-2",
    text: "Which HTTP methods are generally considered idempotent?",
    imageUrl: null,
    type: "MULTIPLE_CHOICE",
    timeLimitSec: 45,
    points: 1200,
    orderIndex: 2,
    explanation: null,
    answerOptions: [
      {
        id: "answer-5",
        text: "GET",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 1,
      },
      {
        id: "answer-6",
        text: "PUT",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 2,
      },
      {
        id: "answer-7",
        text: "POST",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 3,
      },
      {
        id: "answer-8",
        text: "DELETE",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 4,
      },
    ],
  },
];
