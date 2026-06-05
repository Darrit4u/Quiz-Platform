import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface AnswerOptionProps {
  text: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export function AnswerOption({
  text,
  selected = false,
  disabled = false,
  onSelect,
}: AnswerOptionProps) {
  return (
    <button
      className={cn(
        "flex min-h-24 items-center justify-between rounded-xl border-2 p-6 text-left text-lg font-medium transition-all",
        selected
          ? "border-violet-600 bg-violet-50 text-violet-900 shadow-sm"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
      )}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <span>{text}</span>
      {selected && <Check className="h-5 w-5 text-violet-600" />}
    </button>
  );
}
