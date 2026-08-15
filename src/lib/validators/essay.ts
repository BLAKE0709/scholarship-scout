import { z } from "zod";

export const AssistModeSchema = z.enum(["solo", "coached"]);

export const CreateEssaySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  prompt: z.string().max(2000).optional(),
  applicationId: z.string().uuid().optional(),
  assistMode: AssistModeSchema.optional(),
});

export const UpdateEssaySchema = z.object({
  content: z.string().max(100000).optional(),
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["draft", "in_progress", "review", "final"]).optional(),
  wordCount: z.number().int().min(0).optional(),
  assistMode: AssistModeSchema.optional(),
});

export const CreateRevisionSchema = z.object({
  content: z.string().min(1),
  wordCount: z.number().int().min(0).optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
  assistMode: AssistModeSchema.optional(),
});

export type CreateEssayInput = z.infer<typeof CreateEssaySchema>;
export type UpdateEssayInput = z.infer<typeof UpdateEssaySchema>;
export type CreateRevisionInput = z.infer<typeof CreateRevisionSchema>;
