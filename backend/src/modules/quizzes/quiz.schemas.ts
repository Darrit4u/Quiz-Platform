import { z } from "zod";

const optionalText = z.string().trim().max(2000).nullable().optional();

export const quizIdParamsSchema = z.object({
  quizId: z.string().min(1),
});

export const questionIdParamsSchema = z.object({
  quizId: z.string().min(1),
  questionId: z.string().min(1),
});

export const createQuizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText,
  categoryId: z.string().min(1).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  visibility: z
    .enum(["PRIVATE", "PUBLIC", "LINK_ONLY"])
    .default("PRIVATE"),
  defaultTimeLimitSec: z.number().int().min(5).max(600).default(30),
  scoringMode: z.enum(["FIXED", "TIME_BASED"]).default("FIXED"),
  shuffleQuestions: z.boolean().default(false),
  shuffleAnswers: z.boolean().default(false),
});

export const updateQuizSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: optionalText,
    categoryId: z.string().min(1).nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    visibility: z.enum(["PRIVATE", "PUBLIC", "LINK_ONLY"]).optional(),
    defaultTimeLimitSec: z.number().int().min(5).max(600).optional(),
    scoringMode: z.enum(["FIXED", "TIME_BASED"]).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleAnswers: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Укажите хотя бы одно поле квиза",
  });

export const answerOptionSchema = z.object({
  text: z.string().trim().min(1).max(500),
  imageUrl: z.string().url().max(2000).nullable().optional(),
  isCorrect: z.boolean(),
  orderIndex: z.number().int().min(1),
});

export const questionIntegritySchema = z
  .object({
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]),
    options: z.array(answerOptionSchema).min(2),
  })
  .superRefine(({ type, options }, context) => {
    const correctOptions = options.filter((option) => option.isCorrect);
    const orderIndexes = options.map((option) => option.orderIndex);

    if (new Set(orderIndexes).size !== orderIndexes.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Порядковые номера вариантов ответа должны быть уникальными",
      });
    }

    if (type === "SINGLE_CHOICE" && correctOptions.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "У вопроса с одним ответом должен быть один правильный вариант",
      });
    }

    if (type === "MULTIPLE_CHOICE" && correctOptions.length < 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "У вопроса с несколькими ответами должен быть хотя бы один правильный вариант",
      });
    }
  });

export const createQuestionSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
    imageUrl: z.string().url().max(2000).nullable().optional(),
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]),
    timeLimitSec: z.number().int().min(5).max(600).nullable().optional(),
    points: z.number().int().positive().max(1_000_000).default(1),
    orderIndex: z.number().int().min(1),
    explanation: z.string().trim().max(2000).nullable().optional(),
    options: z.array(answerOptionSchema).min(2),
  })
  .superRefine((input, context) => {
    const result = questionIntegritySchema.safeParse({
      type: input.type,
      options: input.options,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
      }
    }
  });

export const updateQuestionSchema = z
  .object({
    text: z.string().trim().min(1).max(2000).optional(),
    imageUrl: z.string().url().max(2000).nullable().optional(),
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]).optional(),
    timeLimitSec: z.number().int().min(5).max(600).nullable().optional(),
    points: z.number().int().positive().max(1_000_000).optional(),
    orderIndex: z.number().int().min(1).optional(),
    explanation: z.string().trim().max(2000).nullable().optional(),
    options: z.array(answerOptionSchema).min(2).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Укажите хотя бы одно поле вопроса",
  });

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
