import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { getSessionByCode, joinSession } from "@/api/sessionApi";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function ParticipantJoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isJoining) {
      return;
    }

    const normalizedCode = code.replace(/\s+/g, "").toUpperCase();
    const normalizedName = name.trim();
    if (!normalizedCode || !normalizedName) {
      setError("Введите код комнаты и имя.");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const session = await getSessionByCode(normalizedCode);
      const result = await joinSession(normalizedCode, normalizedName);
      navigate(`/participant/rooms/${session.id}/lobby`, {
        state: {
          participantName: result.participant.displayName,
          roomCode: result.session.roomCode,
        },
      });
    } catch (joinError) {
      setError(getErrorMessage(joinError));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-zinc-50 px-6 py-12">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Подключение к квизу
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Введите код комнаты, который сообщил организатор.
        </p>
      </div>

      <div className="mx-auto mt-8 w-full max-w-md">
        <Card>
          <CardContent className="p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="sr-only">Код комнаты</span>
                <Input
                  className="h-14 text-center text-2xl font-bold tracking-widest placeholder:text-zinc-300"
                  disabled={isJoining}
                  maxLength={7}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setError("");
                  }}
                  placeholder="842 901"
                  required
                  value={code}
                />
              </label>
              <label className="block">
                <span className="sr-only">Ваше имя</span>
                <Input
                  className="h-12"
                  disabled={isJoining}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                  placeholder="Ваше имя"
                  required
                  value={name}
                />
              </label>
              <Button
                className="h-12 w-full text-lg"
                disabled={isJoining || !code.trim() || !name.trim()}
                size="lg"
                type="submit"
              >
                {isJoining ? "Подключение..." : "Войти в комнату"}
              </Button>
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
