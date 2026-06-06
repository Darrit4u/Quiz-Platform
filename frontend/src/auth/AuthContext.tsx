import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "@/api/authApi";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/api/httpClient";
import { AuthContext } from "@/auth/authContextValue";
import type { User } from "@/types/user";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!getStoredToken()) {
        setIsLoading(false);
        return;
      }

      try {
        setUser(await authApi.getCurrentUser());
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [logout]);

  useEffect(() => {
    window.addEventListener("auth:unauthorized", logout);
    return () => window.removeEventListener("auth:unauthorized", logout);
  }, [logout]);

  const login = useCallback(async (input: authApi.LoginInput) => {
    const result = await authApi.login(input);
    setStoredToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (input: authApi.RegisterInput) => {
    const result = await authApi.register(input);
    setStoredToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    const updatedUser = await authApi.updateProfile(name);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, updateProfile, logout }),
    [isLoading, login, logout, register, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
