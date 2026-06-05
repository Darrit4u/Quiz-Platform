import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/types/user";

export function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("organizer");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(role === "organizer" ? "/organizer" : "/participant/join");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          Sign in to your account
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Choose a demo role and enter any credentials.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-900">
            Continue as
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {(["organizer", "participant"] as UserRole[]).map((value) => (
              <button
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors",
                  role === value
                    ? "border-violet-600 bg-violet-50 text-violet-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                )}
                key={value}
                onClick={() => setRole(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span>Email</span>
          <Input placeholder="name@company.com" required type="email" />
        </label>

        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span className="flex items-center justify-between">
            Password
            <button
              className="font-medium text-violet-600 hover:text-violet-500"
              type="button"
            >
              Forgot password?
            </button>
          </span>
          <Input minLength={4} required type="password" />
        </label>

        <Button className="w-full" type="submit">
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link
          className="font-medium text-violet-600 hover:text-violet-500"
          to="/register"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
