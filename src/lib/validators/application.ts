import { z } from "zod";

export const createApplicationSchema = z.object({
  scholarshipId: z.string().uuid(),
  matchId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const updateApplicationSchema = z.object({
  status: z
    .enum([
      "draft",
      "in_progress",
      "submitted",
      "under_review",
      "accepted",
      "rejected",
      "withdrawn",
    ])
    .optional(),
  notes: z.string().optional(),
});

export const uploadDocumentSchema = z.object({
  applicationId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum([
    "transcript",
    "recommendation_letter",
    "certificate",
    "financial_aid",
    "other",
  ]),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
