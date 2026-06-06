import { Copy, QrCode } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface RoomCodeBlockProps {
  code: string;
}

export function RoomCodeBlock({ code }: RoomCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard?.writeText(code.replaceAll(" ", ""));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
        Подключитесь к квизу по коду
      </p>
      <div className="rounded-2xl border border-zinc-200 bg-white px-12 py-6 shadow-sm">
        <span className="text-7xl font-bold tracking-widest text-zinc-950">
          {code}
        </span>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={copyCode} size="sm" variant="outline">
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Скопировано" : "Копировать код"}
        </Button>
        <Button size="sm" variant="outline">
          <QrCode className="mr-2 h-4 w-4" />
          QR-код
        </Button>
      </div>
    </div>
  );
}
