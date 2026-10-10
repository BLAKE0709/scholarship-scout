import { z } from "zod";

export const educationLevelOptions = [
  { value: "high_school", label: "High school" },
  { value: "undergraduate", label: "Undergraduate / another bachelor's" },
  { value: "graduate", label: "Master's / graduate study" },
  { value: "doctoral", label: "Doctoral study" },
  { value: "certificate", label: "Certificate / professional training" },
  { value: "not_enrolled", label: "Exploring / returning to education" },
] as const;
export const degreeOptions = [
  { value: "none", label: "No completed credential" },
  { value: "high_school", label: "High school / GED" },
  { value: "certificate", label: "Certificate" },
  { value: "associate", label: "Associate degree" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "master", label: "Master's degree" },
  { value: "doctorate", label: "Doctorate" },
] as const;
const text = z.string().trim().max(2000).nullable().optional();
const list = z.array(z.string().trim().min(1).max(200)).max(30).transform((values) => [...new Set(values)]).nullable().optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const parsed = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
}, "Enter a real calendar date").nullable().optional();

export const EducationProfileSchema = z.object({
  version: z.literal(1),
  educationLevel: z.enum(["high_school", "undergraduate", "graduate", "doctoral", "certificate", "not_enrolled"]).nullable().optional(),
  highestDegree: z.enum(["none", "high_school", "certificate", "associate", "bachelor", "master", "doctorate"]).nullable().optional(),
  targetDegree: z.enum(["certificate", "associate", "bachelor", "master", "doctorate"]).nullable().optional(),
  priorField: text, alumniSchools: list, targetSchools: list,
  enrollmentStatus: z.enum(["planning", "applied", "accepted", "enrolled"]).nullable().optional(),
  attendance: z.enum(["full_time", "part_time"]).nullable().optional(),
  studyMode: z.enum(["online", "on_campus", "hybrid"]).nullable().optional(),
  startDate: date, completionDate: date, birthDate: date,
  educationGapMonths: z.number().int().min(0).max(1200).nullable().optional(),
  employmentStatus: text, employerName: text, workExperience: text,
  caregivingResponsibilities: list, citizenship: text,
  serviceCommitment: z.boolean().nullable().optional(),
  memberships: list, sponsorships: list,
}).superRefine((value, ctx) => {
  if (value.startDate && value.completionDate && value.completionDate < value.startDate) {
    ctx.addIssue({ code: "custom", path: ["completionDate"], message: "Completion must be on or after the start date" });
  }
});
export type EducationProfile = z.infer<typeof EducationProfileSchema>;

export function parseEducationProfile(value: unknown): EducationProfile | null {
  const result = EducationProfileSchema.safeParse(value);
  return result.success ? result.data : null;
}
export function isSchoolStudent(value: unknown, legacyGrade?: string | null): boolean {
  const education = parseEducationProfile(value);
  if (education?.educationLevel) return education.educationLevel === "high_school";
  return ["freshman", "sophomore", "junior", "senior"].includes(legacyGrade ?? "");
}
export function educationSummary(value: unknown): string {
  const profile = parseEducationProfile(value);
  if (!profile) return "Education history has not been supplied.";
  // Explicit academic-only allowlist. Personal work, caregiving, citizenship,
  // birth date, affiliations, sponsorships, and free-form fields never enter AI context.
  const facts = { educationLevel: profile.educationLevel, highestDegree: profile.highestDegree, targetDegree: profile.targetDegree, studyMode: profile.studyMode, attendance: profile.attendance, enrollmentStatus: profile.enrollmentStatus };
  return Object.entries(facts).filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${value}`).join("\n");
}

/** Optional test scores and sensitive facts never reduce profile completeness. */
export function profileCompleteness(profile: Record<string, unknown>): number {
  const education = parseEducationProfile(profile.education_profile ?? profile.educationProfile);
  const grade = (profile.grade_level ?? profile.gradeLevel) as string | undefined;
  const major = profile.intended_major ?? profile.intendedMajor;
  const checks = [Boolean(profile.state), Boolean(major), Boolean(profile.gpa),
    Boolean((profile.interests as unknown[] | undefined)?.length),
    Boolean((profile.extracurriculars as unknown[] | undefined)?.length || education?.workExperience),
  ];
  if (isSchoolStudent(education, grade)) {
    checks.push(Boolean(grade), Boolean(profile.graduation_year ?? profile.graduationYear), Boolean(profile.school_name ?? profile.schoolName));
  } else {
    checks.push(Boolean(education?.educationLevel || grade), Boolean(education?.highestDegree), Boolean(education?.targetDegree), Boolean(education?.studyMode), Boolean(education?.targetSchools?.length), Boolean(education?.enrollmentStatus));
  }
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}
