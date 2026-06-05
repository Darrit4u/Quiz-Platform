import type { Room } from "@/types/room";

export const mockRoom: Room = {
  id: "room-1",
  code: "842 901",
  quizId: "quiz-1",
  organizerId: "organizer-1",
  status: "lobby",
  currentQuestionIndex: 0,
  participants: [
    { id: "participant-1", name: "Alex Chen", score: 9450, correctAnswers: 10 },
    { id: "participant-2", name: "Sarah Miller", score: 8820, correctAnswers: 9 },
    { id: "participant-3", name: "David Kim", score: 8100, correctAnswers: 9 },
    { id: "participant-4", name: "Emma Watson", score: 7650, correctAnswers: 8 },
    { id: "participant-5", name: "James Smith", score: 6200, correctAnswers: 7 },
  ],
};
