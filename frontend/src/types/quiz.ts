export type QuizStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type QuizVisibility = "PRIVATE" | "PUBLIC" | "LINK_ONLY";
export type ScoringMode = "FIXED" | "TIME_BASED";
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE";

export interface QuizCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface AnswerOption {
  id: string;
  questionId?: string;
  text: string;
  imageUrl: string | null;
  isCorrect: boolean;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  quizId?: string;
  text: string;
  imageUrl: string | null;
  type: QuestionType;
  timeLimitSec: number | null;
  points: number;
  orderIndex: number;
  explanation: string | null;
  createdAt?: string;
  updatedAt?: string;
  answerOptions: AnswerOption[];
}

export interface Quiz {
  id: string;
  creatorId: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  status: QuizStatus;
  visibility: QuizVisibility;
  defaultTimeLimitSec: number;
  scoringMode: ScoringMode;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  createdAt: string;
  updatedAt: string;
  category?: QuizCategory | null;
  questionCount?: number;
  sessionCount?: number;
  questions?: Question[];
}

export interface CreateQuizInput {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  status: QuizStatus;
  visibility: QuizVisibility;
  defaultTimeLimitSec: number;
  scoringMode: ScoringMode;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
}

export interface AnswerOptionInput {
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
  orderIndex: number;
}

export interface QuestionInput {
  text: string;
  imageUrl?: string | null;
  type: QuestionType;
  timeLimitSec?: number | null;
  points: number;
  orderIndex: number;
  explanation?: string | null;
  options: AnswerOptionInput[];
}
