import { TimerIcon } from "lucide-react";

interface TimerProps {
  seconds: number;
}

export function Timer({ seconds }: TimerProps) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const value = `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 text-zinc-700">
      <TimerIcon className="h-5 w-5" />
      <span className="font-mono text-xl font-bold">{value}</span>
    </div>
  );
}
