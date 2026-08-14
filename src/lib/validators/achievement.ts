import { z } from "zod";

export const createAchievementSchema = z.object({
  type: z.enum([
    "academic",
    "athletic",
    "community_service",
    "leadership",
    "arts",
    "work_experience",
    "award",
    "certification",
    "other",
  ]),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be under 200 characters"),
  description: z.string().max(2000).nullable().optional(),
  organization: z.string().max(200).nullable().optional(),
  dateStart: z.string().nullable().optional(),
  dateEnd: z.string().nullable().optional(),
});

export const updateAchievementSchema = createAchievementSchema.partial();

export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;
export type UpdateAchievementInput = z.infer<typeof updateAchievementSchema>;
