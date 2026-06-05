import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { User } from "@/types/user";

function getDestination(user: User) {
  return user.role === "PARTICIPANT" ? "/participant/join" : "/organizer";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      navigate(getDestination(user), { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          Sign in to your account
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Welcome back. Please enter your details.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span>Email</span>
          <Input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span>Password</span>
          <Input
            autoComplete="current-password"
            minLength={1}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing In..." : "Sign In"}
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
