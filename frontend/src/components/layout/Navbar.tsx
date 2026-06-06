import { ChevronDown, Pencil } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getErrorMessage } from "@/api/httpClient";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function Navbar() {
  const { user, updateProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const initials = user?.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const roleLabel =
    user?.role === "PARTICIPANT"
      ? "участник"
      : user?.role === "ADMIN"
        ? "администратор"
        : "организатор";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName || isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await updateProfile(normalizedName);
      setIsEditing(false);
      setIsOpen(false);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-end border-b border-zinc-200 bg-white px-8">
      <div className="relative">
        <button
          aria-expanded={isOpen}
          className="flex items-center rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50"
          onClick={() => {
            setIsOpen((current) => !current);
            setName(user?.name ?? "");
            setError("");
          }}
          type="button"
        >
          <div className="text-right">
            <p className="text-sm font-medium text-zinc-900">{user?.name}</p>
            <p className="text-xs capitalize text-zinc-500">
              {roleLabel}
            </p>
          </div>
          <div className="ml-3 flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
            {initials}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 text-zinc-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
            {isEditing ? (
              <form className="space-y-3" onSubmit={handleSubmit}>
                <label className="block space-y-2 text-sm font-medium text-zinc-900">
                  <span>Имя организатора</span>
                  <Input
                    autoFocus
                    disabled={isSaving}
                    maxLength={100}
                    minLength={2}
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                  />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button
                    disabled={isSaving}
                    onClick={() => setIsEditing(false)}
                    size="sm"
                    variant="outline"
                  >
                    Отмена
                  </Button>
                  <Button disabled={isSaving} size="sm" type="submit">
                    {isSaving ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              </form>
            ) : (
              <button
                className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => setIsEditing(true)}
                type="button"
              >
                <Pencil className="mr-3 h-4 w-4 text-zinc-400" />
                Изменить имя
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
