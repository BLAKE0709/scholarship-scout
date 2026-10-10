import { z } from "zod";
import {
  EducationProfileSchema,
  parseEducationProfile,
  profileCompleteness,
  type EducationProfile,
} from "@/lib/profiles/education";

export const gradeLevelSchema = z.enum([
  "freshman",
  "sophomore",
  "junior",
  "senior",
  "college_freshman",
  "college_sophomore",
  "college_junior",
  "college_senior",
]);

export function isGradeCompatibleWithEducation(
  educationLevel: EducationProfile["educationLevel"],
  gradeLevel: string | null | undefined,
): boolean {
  if (gradeLevel == null || !educationLevel) return true;
  if (educationLevel === "high_school") return !gradeLevel.startsWith("college_");
  if (educationLevel === "undergraduate") return gradeLevel.startsWith("college_");
  return false;
}

const graduationYearSchema = z.union([
  z.coerce.number().int().min(1900).max(9999),
  z.null(),
]);

export const basicsSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  state: z.string().min(2, "Please select a state"),
  city: z.string().trim().max(200).nullable().optional(),
  schoolName: z.string().trim().max(200).nullable().optional(),
  graduationYear: graduationYearSchema.optional(),
  gradeLevel: gradeLevelSchema.nullable().optional(),
  educationProfile: EducationProfileSchema.optional(),
});

export const educationStepSchema = z.object({
  educationProfile: EducationProfileSchema.refine(
    (profile) => Boolean(profile.educationLevel),
    { message: "Please select your current education path", path: ["educationLevel"] },
  ),
  schoolName: z.string().trim().max(200).nullable().optional(),
  graduationYear: graduationYearSchema.optional(),
  gradeLevel: gradeLevelSchema.nullable().optional(),
}).transform((value) => ({
  ...value,
  gradeLevel: isGradeCompatibleWithEducation(
    value.educationProfile.educationLevel,
    value.gradeLevel,
  ) ? (value.gradeLevel ?? null) : null,
}));

export const academicsSchema = z.object({
  gpa: z.coerce.number().min(0).max(5.0).optional().or(z.literal("")),
  gpaScale: z.coerce.number().min(4.0).max(5.0).default(4.0),
  satScore: z.coerce.number().min(400).max(1600).optional().or(z.literal("")),
  actScore: z.coerce.number().min(1).max(36).optional().or(z.literal("")),
  intendedMajor: z.string().trim().max(300).nullable().optional(),
});

export const aboutYouSchema = z.object({
  interests: z.array(z.string()).default([]),
  extracurriculars: z.array(z.string()).default([]),
  ethnicity: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
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

export function usesLegacySchoolFields(
  value: unknown,
  legacyGrade?: string | null,
): boolean {
  const profile = parseEducationProfile(value);
  if (profile?.educationLevel) {
    return ["high_school", "undergraduate"].includes(profile.educationLevel);
  }
  return gradeLevelSchema.safeParse(legacyGrade).success;
}

export function shouldShowSchoolTests(
  value: unknown,
  legacyGrade?: string | null,
): boolean {
  return usesLegacySchoolFields(value, legacyGrade);
}

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function nullableNumber(value: number | "" | null | undefined): number | null {
  return value === "" || value === null || value === undefined
    ? null
    : Number(value);
}

/**
 * Creates the snake_case payload shared by onboarding and the vault editor.
 * Nulls are deliberate: clearing an optional field must persist, and adult
 * paths must not retain incompatible legacy grade or standardized-test data.
 */
export function buildStudentProfileUpdate(
  data: OnboardingData,
  throughStep = 4,
): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  const education = data.basics.educationProfile;
  const legacyPath = usesLegacySchoolFields(education, data.basics.gradeLevel);

  if (throughStep >= 1) {
    if (data.basics.state) update.state = data.basics.state;
    update.city = nullableText(data.basics.city);
  }

  if (throughStep >= 2) {
    if (education) update.education_profile = education;
    if (legacyPath) {
      update.school_name = nullableText(data.basics.schoolName);
      update.graduation_year = data.basics.graduationYear ?? null;
      update.grade_level = isGradeCompatibleWithEducation(
        education?.educationLevel,
        data.basics.gradeLevel,
      ) ? (data.basics.gradeLevel ?? null) : null;
    } else if (education?.educationLevel) {
      update.school_name = null;
      update.graduation_year = null;
      update.grade_level = null;
    }
  }

  if (throughStep >= 3) {
    update.gpa = nullableNumber(data.academics.gpa);
    update.gpa_scale = data.academics.gpaScale ?? 4;
    update.intended_major = nullableText(data.academics.intendedMajor);
    if (shouldShowSchoolTests(education, data.basics.gradeLevel)) {
      update.sat_score = nullableNumber(data.academics.satScore);
      update.act_score = nullableNumber(data.academics.actScore);
    } else if (education?.educationLevel) {
      update.sat_score = null;
      update.act_score = null;
    }
  }

  if (throughStep >= 4) {
    update.interests = data.aboutYou.interests ?? [];
    update.extracurriculars = data.aboutYou.extracurriculars ?? [];
    update.ethnicity = nullableText(data.aboutYou.ethnicity);
    update.gender = nullableText(data.aboutYou.gender);
    update.first_generation = data.aboutYou.firstGeneration ?? null;
    update.financial_need = data.aboutYou.financialNeed ?? null;
  }

  return update;
}

export function calculateOnboardingVaultScore(data: OnboardingData): number {
  return profileCompleteness(buildStudentProfileUpdate(data, 4));
}

export function educationProfileFromLegacy(
  value: unknown,
  legacyGrade?: string | null,
): EducationProfile {
  const parsed = parseEducationProfile(value);
  if (parsed) return parsed;
  if (legacyGrade) {
    return {
      version: 1,
      educationLevel: legacyGrade.startsWith("college_")
        ? "undergraduate"
        : "high_school",
    };
  }
  return { version: 1 };
}
export function requireUpdatedRow<T extends { id: string }>(
  result: { data: T | null; error: { message: string } | null },
  missingMessage: string,
): T {
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error(missingMessage);
  return result.data;
}
