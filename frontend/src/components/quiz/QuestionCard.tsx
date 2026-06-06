import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface QuestionCardProps {
  question: string;
  imageUrl?: string;
  children: ReactNode;
  className?: string;
}

export function QuestionCard({
  question,
  imageUrl,
  children,
  className,
}: QuestionCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex h-full flex-col space-y-8 p-8">
        <h2 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900">
          {question}
        </h2>
        {imageUrl && (
          <img
            alt={question}
            className="max-h-64 max-w-full self-center rounded-lg object-contain"
            src={imageUrl}
          />
        )}
        {children}
      </CardContent>
    </Card>
  );
}
