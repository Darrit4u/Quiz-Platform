import { httpClient } from "@/api/httpClient";
import type { User, UserRole } from "@/types/user";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "ADMIN">;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export function register(input: RegisterInput) {
  return httpClient<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput) {
  return httpClient<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCurrentUser() {
  const response = await httpClient<{ user: User }>("/auth/me");
  return response.user;
}
