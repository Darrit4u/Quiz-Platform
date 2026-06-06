import { z } from "zod";

export const quizSessionParamsSchema = z.object({
  quizId: z.string().min(1),
});

export const sessionParamsSchema = z.object({
  sessionId: z.string().min(1),
});

export const roomCodeParamsSchema = z.object({
  roomCode: z
    .string()
    .trim()
    .min(4)
    .max(12)
    .transform((value) => value.toUpperCase()),
});

export const joinSessionSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIds: z
    .array(z.string().min(1))
    .min(1)
    .max(20)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Выбранные варианты ответа не должны повторяться",
    }),
});

export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
