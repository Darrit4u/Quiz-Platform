import { ArrowLeft, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { LeaderboardTable } from "@/components/quiz/LeaderboardTable";
import { Button } from "@/components/ui/Button";
import { mockResults } from "@/data/mockResults";

interface ResultsState {
  from?: "organizer" | "participant";
}

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultsState | null;
  const destination =
    state?.from === "participant" ? "/participant/join" : "/organizer";
  const destinationLabel =
    state?.from === "participant" ? "Join Another Quiz" : "Back to Dashboard";

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <Button
            className="text-zinc-500"
            onClick={() => navigate(destination)}
            variant="ghost"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {destinationLabel}
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Final Results
          </h1>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100">
            <Trophy className="h-12 w-12 text-yellow-600" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900">
            Session Complete!
          </h2>
          <p className="text-lg font-medium text-zinc-500">
            Q3 All-Hands Engineering Trivia
          </p>
        </div>

        <LeaderboardTable entries={mockResults} />

        <div className="flex justify-center pt-6">
          <Button onClick={() => navigate(destination)} size="lg">
            {destinationLabel}
          </Button>
        </div>
      </div>
    </main>
  );
}
