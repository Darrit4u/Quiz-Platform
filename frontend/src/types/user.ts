export type UserRole = "ORGANIZER" | "PARTICIPANT" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
