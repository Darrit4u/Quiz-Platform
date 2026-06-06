import { Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/types/room";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 font-medium text-zinc-500">
          <tr>
            <th className="w-24 px-6 py-4 text-center">Место</th>
            <th className="px-6 py-4">Участник</th>
            <th className="px-6 py-4 text-center">Правильные ответы</th>
            <th className="px-6 py-4 text-right">Баллы</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {entries.map((entry) => (
            <tr
              className={entry.rank === 1 ? "bg-violet-50/50" : "bg-white"}
              key={entry.id}
            >
              <td className="px-6 py-4 text-center">
                {entry.rank <= 3 ? (
                  <Medal
                    className={
                      entry.rank === 1
                        ? "mx-auto h-6 w-6 text-yellow-500"
                        : entry.rank === 2
                          ? "mx-auto h-6 w-6 text-zinc-400"
                          : "mx-auto h-6 w-6 text-orange-400"
                    }
                  />
                ) : (
                  <span className="font-medium text-zinc-500">{entry.rank}</span>
                )}
              </td>
              <td className="px-6 py-4">
                <span
                  className={
                    entry.rank === 1
                      ? "font-bold text-violet-700"
                      : "font-medium text-zinc-900"
                  }
                >
                  {entry.name}
                </span>
              </td>
              <td className="px-6 py-4 text-center text-zinc-700">
                {entry.correctAnswers} / {entry.totalQuestions}
              </td>
              <td className="px-6 py-4 text-right">
                <span
                  className={
                    entry.rank === 1
                      ? "font-mono text-lg font-bold text-violet-700"
                      : "font-mono text-lg font-bold text-zinc-900"
                  }
                >
                  {entry.score.toLocaleString()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
