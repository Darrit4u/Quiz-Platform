import { Play, Users, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getErrorMessage } from "@/api/httpClient";
import { cancelSession } from "@/api/sessionApi";
import { RoomCodeBlock } from "@/components/quiz/RoomCodeBlock";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useSessionSocket } from "@/hooks/useSessionSocket";

export function HostLobbyPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const {
    isConnected,
    sessionState,
    participants,
    error,
    pendingCommand,
    startSession,
  } = useSessionSocket(roomId);

  useEffect(() => {
    if (sessionState?.status === "QUESTION_ACTIVE" && roomId) {
      navigate(`/organizer/rooms/${roomId}/live`);
    }
    if (sessionState?.status === "CANCELLED") {
      navigate("/organizer", { replace: true });
    }
  }, [navigate, roomId, sessionState?.status]);

  const handleCancel = async () => {
    if (!roomId || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setCancelError("");

    try {
      await cancelSession(roomId);
      navigate("/organizer", { replace: true });
    } catch (cancelFailure) {
      setCancelError(getErrorMessage(cancelFailure));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col items-center justify-center space-y-8">
        <RoomCodeBlock code={sessionState?.roomCode ?? "------"} />

        {(error || cancelError) && (
          <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
            {cancelError || error}
          </p>
        )}

        <div className="grid w-full max-w-3xl grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
                  <Users className="h-8 w-8 text-violet-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-zinc-900">
                    {participants.length}
                  </p>
                  <p className="text-sm font-medium text-zinc-500">
                    Подключилось участников
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              className="h-14 w-full text-lg"
              disabled={
                !isConnected ||
                sessionState?.status !== "WAITING_FOR_PLAYERS" ||
                pendingCommand !== null
              }
              onClick={startSession}
              size="lg"
            >
              <Play className="mr-2 h-5 w-5" />
              {pendingCommand === "start" ? "Запуск..." : "Начать квиз"}
            </Button>
            <Button
              className="h-12 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={
                isCancelling ||
                pendingCommand !== null ||
                sessionState?.status !== "WAITING_FOR_PLAYERS"
              }
              onClick={() => setIsCancelModalOpen(true)}
              variant="outline"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Отменить сессию
            </Button>
          </div>

          <Card className="col-span-2">
            <CardContent className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Комната ожидания
              </h2>
              <div className="flex flex-wrap gap-3">
                {participants.map((participant) => (
                  <span
                    className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800"
                    key={participant.participantId}
                  >
                    {participant.displayName}
                  </span>
                ))}
                <span className="animate-pulse px-4 py-2 text-sm font-medium text-zinc-400">
                  Ожидание участников...
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Modal
        onClose={() => {
          if (!isCancelling) {
            setIsCancelModalOpen(false);
          }
        }}
        open={isCancelModalOpen}
        title="Отменить сессию?"
      >
        <p className="text-sm text-zinc-600">
          Участники больше не смогут подключиться к комнате. Квиз снова станет
          доступен для редактирования.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            disabled={isCancelling}
            onClick={() => setIsCancelModalOpen(false)}
            variant="outline"
          >
            Продолжить сессию
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={isCancelling}
            onClick={handleCancel}
          >
            {isCancelling ? "Отмена..." : "Отменить сессию"}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
