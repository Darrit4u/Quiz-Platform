import { Play, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { RoomCodeBlock } from "@/components/quiz/RoomCodeBlock";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { mockRoom } from "@/data/mockRooms";

export function HostLobbyPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col items-center justify-center space-y-8">
        <RoomCodeBlock code={mockRoom.code} />

        <div className="grid w-full max-w-3xl grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
                  <Users className="h-8 w-8 text-violet-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-zinc-900">
                    {mockRoom.participants.length}
                  </p>
                  <p className="text-sm font-medium text-zinc-500">
                    Participants Joined
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              className="h-14 w-full text-lg"
              onClick={() =>
                navigate(`/organizer/rooms/${roomId ?? mockRoom.id}/live`)
              }
              size="lg"
            >
              <Play className="mr-2 h-5 w-5" />
              Start Session
            </Button>
          </div>

          <Card className="col-span-2">
            <CardContent className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Waiting Room
              </h2>
              <div className="flex flex-wrap gap-3">
                {mockRoom.participants.map((participant) => (
                  <span
                    className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800"
                    key={participant.id}
                  >
                    {participant.name}
                  </span>
                ))}
                <span className="animate-pulse px-4 py-2 text-sm font-medium text-zinc-400">
                  Waiting for more...
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
