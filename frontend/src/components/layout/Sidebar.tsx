import { LayoutDashboard, LogOut, PlusCircle } from "lucide-react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/cn";

const navigation = [
  { name: "Dashboard", href: "/organizer", icon: LayoutDashboard, exact: true },
  {
    name: "Create Quiz",
    href: "/organizer/quizzes/new",
    icon: PlusCircle,
    exact: false,
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-200 bg-white">
      <div className="flex flex-1 flex-col overflow-y-auto pt-5">
        <Link className="px-6 text-xl font-bold tracking-tight text-zinc-900" to="/organizer">
          QuizPlatform
        </Link>
        <nav className="mt-8 flex-1 space-y-1 px-4">
          {navigation.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                className={cn(
                  "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-violet-50 text-violet-700"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                )}
                to={item.href}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5",
                    isActive
                      ? "text-violet-600"
                      : "text-zinc-400 group-hover:text-zinc-500",
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-200 p-4">
          <Link
            className="flex items-center rounded-md px-2 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            to="/login"
          >
            <LogOut className="mr-3 h-5 w-5 text-zinc-400" />
            Sign Out
          </Link>
        </div>
      </div>
    </aside>
  );
}
