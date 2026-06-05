export type RoomStatus = "lobby" | "active" | "finished";

export interface Participant {
  id: string;
  name: string;
  score: number;
  correctAnswers: number;
}

export interface Room {
  id: string;
  code: string;
  quizId: string;
  organizerId: string;
  status: RoomStatus;
  participants: Participant[];
  currentQuestionIndex: number;
}

export interface LeaderboardEntry extends Participant {
  rank: number;
  totalQuestions: number;
}
