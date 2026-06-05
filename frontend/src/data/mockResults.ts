import { mockRoom } from "@/data/mockRooms";
import type { LeaderboardEntry } from "@/types/room";

export const mockResults: LeaderboardEntry[] = mockRoom.participants.map(
  (participant, index) => ({
    ...participant,
    rank: index + 1,
    totalQuestions: 10,
  }),
);
