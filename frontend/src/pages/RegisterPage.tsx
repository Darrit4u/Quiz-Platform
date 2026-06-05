import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/types/user";

export function RegisterPage() {
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
          Create an account
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Start organizing or joining sessions today.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span>Full Name</span>
          <Input placeholder="Jane Doe" required />
        </label>
        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span>Email</span>
          <Input placeholder="name@company.com" required type="email" />
        </label>
        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span>Password</span>
          <Input minLength={4} required type="password" />
        </label>

        <fieldset className="space-y-3 pt-2">
          <legend className="text-sm font-medium text-zinc-900">
            I want to...
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <button
              className={cn(
                "rounded-lg border p-4 font-medium transition-colors",
                role === "organizer"
                  ? "border-violet-600 bg-violet-50 text-violet-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
              )}
              onClick={() => setRole("organizer")}
              type="button"
            >
              Host Quizzes
            </button>
            <button
              className={cn(
                "rounded-lg border p-4 font-medium transition-colors",
                role === "participant"
                  ? "border-violet-600 bg-violet-50 text-violet-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
              )}
              onClick={() => setRole("participant")}
              type="button"
            >
              Join Quizzes
            </button>
          </div>
        </fieldset>

        <Button className="mt-4 w-full" type="submit">
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          className="font-medium text-violet-600 hover:text-violet-500"
          to="/login"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
