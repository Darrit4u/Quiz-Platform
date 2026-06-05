import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/auth/useAuth";
import type { UserRole } from "@/types/user";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

function getHomeRoute(role: UserRole) {
  return role === "PARTICIPANT" ? "/participant/join" : "/organizer";
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        Loading account...
      </main>
    );
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate replace to={getHomeRoute(user.role)} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        Loading account...
      </main>
    );
  }

  return user ? <Navigate replace to={getHomeRoute(user.role)} /> : <Outlet />;
}

export function HomeRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Navigate replace to={user ? getHomeRoute(user.role) : "/login"} />
  );
}
