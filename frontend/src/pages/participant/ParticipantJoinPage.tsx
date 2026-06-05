import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { mockRoom } from "@/data/mockRooms";

export function ParticipantJoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/participant/rooms/${mockRoom.id}/lobby`, {
      state: { participantName: name, roomCode: code },
    });
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-zinc-50 px-6 py-12">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Join a Session
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter the room code provided by your host.
        </p>
      </div>

      <div className="mx-auto mt-8 w-full max-w-md">
        <Card>
          <CardContent className="p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="sr-only">Room Code</span>
                <Input
                  className="h-14 text-center text-2xl font-bold tracking-widest placeholder:text-zinc-300"
                  maxLength={7}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="842 901"
                  required
                  value={code}
                />
              </label>
              <label className="block">
                <span className="sr-only">Your Name</span>
                <Input
                  className="h-12"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your Name"
                  required
                  value={name}
                />
              </label>
              <Button className="h-12 w-full text-lg" size="lg" type="submit">
                Join Room
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
