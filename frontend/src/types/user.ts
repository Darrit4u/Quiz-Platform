export type UserRole = "organizer" | "participant";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
