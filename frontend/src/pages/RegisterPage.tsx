import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { cn } from "@/lib/cn";
import type { User, UserRole } from "@/types/user";

type RegistrationRole = Exclude<UserRole, "ADMIN">;

function getDestination(user: User) {
  return user.role === "PARTICIPANT" ? "/participant/join" : "/organizer";
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState<RegistrationRole>("ORGANIZER");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("Пароли не совпадают.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await register({ name, email, password, role });
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
          Создание аккаунта
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Создавайте квизы или участвуйте в них.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span>Имя</span>
          <Input
            autoComplete="name"
            minLength={2}
            onChange={(event) => setName(event.target.value)}
            placeholder="Иван Иванов"
            required
            value={name}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span>Электронная почта</span>
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
          <span>Пароль</span>
          <PasswordInput
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            value={password}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium text-zinc-900">
          <span>Повторите пароль</span>
          <PasswordInput
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            required
            value={passwordConfirmation}
          />
        </label>

        <fieldset className="space-y-3 pt-2">
          <legend className="text-sm font-medium text-zinc-900">
            Я хочу...
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <button
              className={cn(
                "rounded-lg border p-4 font-medium transition-colors",
                role === "ORGANIZER"
                  ? "border-violet-600 bg-violet-50 text-violet-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
              )}
              onClick={() => setRole("ORGANIZER")}
              type="button"
            >
              Проводить квизы
            </button>
            <button
              className={cn(
                "rounded-lg border p-4 font-medium transition-colors",
                role === "PARTICIPANT"
                  ? "border-violet-600 bg-violet-50 text-violet-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
              )}
              onClick={() => setRole("PARTICIPANT")}
              type="button"
            >
              Участвовать в квизах
            </button>
          </div>
        </fieldset>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button
          className="mt-4 w-full"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Создание аккаунта..." : "Создать аккаунт"}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Уже есть аккаунт?{" "}
        <Link
          className="font-medium text-violet-600 hover:text-violet-500"
          to="/login"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}
