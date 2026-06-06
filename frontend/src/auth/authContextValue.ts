import { createContext } from "react";
import type * as authApi from "@/api/authApi";
import type { User } from "@/types/user";

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (input: authApi.LoginInput) => Promise<User>;
  register: (input: authApi.RegisterInput) => Promise<User>;
  updateProfile: (name: string) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
