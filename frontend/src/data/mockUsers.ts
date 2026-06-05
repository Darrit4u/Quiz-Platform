import type { User } from "@/types/user";

export const mockUsers: User[] = [
  {
    id: "organizer-1",
    name: "Jane Doe",
    email: "jane@company.com",
    role: "ORGANIZER",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "participant-1",
    name: "Alex Chen",
    email: "alex@company.com",
    role: "PARTICIPANT",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];
