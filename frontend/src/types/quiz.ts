export type QuestionType = "single" | "multiple";
export type QuizStatus = "draft" | "published";

export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  type: QuestionType;
  answers: Answer[];
  timeLimit: number;
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  status: QuizStatus;
  questions: Question[];
  lastEdited: string;
  sessionsCount: number;
}
