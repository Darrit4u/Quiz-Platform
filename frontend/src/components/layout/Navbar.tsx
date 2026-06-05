import { useAuth } from "@/auth/useAuth";

export function Navbar() {
  const { user } = useAuth();
  const initials = user?.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-end border-b border-zinc-200 bg-white px-8">
      <div className="text-right">
        <p className="text-sm font-medium text-zinc-900">{user?.name}</p>
        <p className="text-xs capitalize text-zinc-500">
          {user?.role.toLowerCase()}
        </p>
      </div>
      <div className="ml-3 flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
        {initials}
      </div>
    </header>
  );
}
