import { z } from "zod";

export const basicsSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  state: z.string().min(2, "Please select a state"),
  city: z.string().optional(),
  schoolName: z.string().optional(),
  graduationYear: z.coerce.number().min(2025).max(2032),
  gradeLevel: z.enum([
    "freshman",
    "sophomore",
    "junior",
    "senior",
    "college_freshman",
    "college_sophomore",
    "college_junior",
    "college_senior",
  ]),
});

export const academicsSchema = z.object({
  gpa: z.coerce.number().min(0).max(5.0).optional().or(z.literal("")),
  gpaScale: z.coerce.number().min(4.0).max(5.0).default(4.0),
  satScore: z.coerce.number().min(400).max(1600).optional().or(z.literal("")),
  actScore: z.coerce.number().min(1).max(36).optional().or(z.literal("")),
  intendedMajor: z.string().optional(),
});

export const aboutYouSchema = z.object({
  interests: z.array(z.string()).default([]),
  extracurriculars: z.array(z.string()).default([]),
  ethnicity: z.string().optional(),
  gender: z.string().optional(),
  firstGeneration: z.boolean().nullable().optional(),
  financialNeed: z.enum(["low", "medium", "high"]).nullable().optional(),
});

export const goalsSchema = z.object({
  goals: z.array(z.string()).min(1, "Please select at least one goal"),
});

export type BasicsInput = z.infer<typeof basicsSchema>;
export type AcademicsInput = z.infer<typeof academicsSchema>;
export type AboutYouInput = z.infer<typeof aboutYouSchema>;
export type GoalsInput = z.infer<typeof goalsSchema>;

export interface OnboardingData {
  basics: Partial<BasicsInput>;
  academics: Partial<AcademicsInput>;
  aboutYou: Partial<AboutYouInput>;
  goals: Partial<GoalsInput>;
}
