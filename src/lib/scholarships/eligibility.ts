import { z } from "zod";
import { parseEducationProfile } from "../profiles/education";
import { parseFunding } from "./funding";

export const eligibilityLabels = { eligible: "Meets listed criteria", needs_information: "Needs confirmation", ineligible: "Not eligible" } as const;
export type EligibilityStatus = keyof typeof eligibilityLabels;
export interface EligibilityAssessment { status: EligibilityStatus; reasons: string[]; missingFields: string[]; concerns: string[] }
export interface EligibilityStudent {
  gpa?: string | number | null; gpaScale?: string | number | null; state?: string | null;
  gradeLevel?: string | null; graduationYear?: number | null; intendedMajor?: string | null;
  gender?: string | null; ethnicity?: string | null; financialNeed?: string | null;
  firstGeneration?: boolean | null; educationProfile?: unknown;
}
export interface EligibilityScholarship {
  eligibility?: unknown; states?: string[] | null; national?: boolean | null;
  deadline?: Date | string | null; status?: string | null; source?: string | null;
  lastVerifiedAt?: Date | string | null; funding?: unknown;
}
const strings = z.array(z.string());
export const CanonicalEligibilitySchema = z.object({
  version: z.literal(1), gradeGroups: z.array(strings), minGpa: z.number().nullable(),
  states: strings, majors: strings, genders: strings, ethnicities: strings, demographics: strings,
  targetDegrees: strings, excludedDegrees: strings, schools: strings, alumniSchools: strings,
  attendance: strings, studyModes: strings, enrollmentStatuses: strings,
  citizenship: strings, memberships: strings, sponsorships: strings,
  minAge: z.number().nullable(), maxAge: z.number().nullable(), ageAsOf: z.string().nullable(),
  graduationYears: z.array(z.number()), gapMonthsMin: z.number().nullable(), completionMonthsMax: z.number().nullable(),
  financialNeed: z.boolean(), firstGeneration: z.boolean(), serviceRequired: z.boolean(),
  unresolved: strings,
});
export type CanonicalEligibility = z.infer<typeof CanonicalEligibilitySchema>;
export function token(value: string): string { return value.toLowerCase().trim().replace(/[?']/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
export function schoolToken(value: string): string {
  const t = token(value);
  return ({ acu: "abilene_christian_university", abilene_christian: "abilene_christian_university", gcu: "grand_canyon_university", grand_canyon: "grand_canyon_university", uta: "university_of_texas_at_arlington", ut_arlington: "university_of_texas_at_arlington" } as Record<string, string>)[t] ?? t;
}
function stringList(value: unknown): string[] { return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : typeof value === "string" && value.trim() ? [value] : []; }
function number(value: unknown): number | null { return (typeof value === "number" || (typeof value === "string" && /^\d+(\.\d+)?$/.test(value))) && Number.isFinite(Number(value)) ? Number(value) : null; }
function identity(value: string): string {
  const t = token(value);
  return ({ female: "woman", women: "woman", male: "man", men: "man", african_american: "black", black_or_african_american: "black", african_american_black: "black", hispanic_or_latino: "hispanic", latino: "hispanic", latina: "hispanic", caucasian: "white", american_indian_or_alaska_native: "native_american" } as Record<string, string>)[t] ?? t;
}

function citizenshipToken(value: string): string | null {
  const t = token(value);
  const aliases: Record<string, string> = { u_s_citizen: "us_citizen", united_states_citizen: "us_citizen", american_citizen: "us_citizen", u_s_national: "us_national", u_s_permanent_resident: "us_permanent_resident", permanent_us_resident: "us_permanent_resident", permanent_resident_of_the_united_states: "us_permanent_resident", canada_citizen: "canadian_citizen", canadian_permanent_resident: "canadian_permanent_resident" };
  const normalized = aliases[t] ?? t;
  return ["us_citizen", "us_national", "us_permanent_resident", "canadian_citizen", "canadian_permanent_resident", "daca", "other"].includes(normalized) ? normalized : null;
}

const grades: Record<string, string> = {
  "9": "freshman", "10": "sophomore", "11": "junior", "12": "senior",
  high_school_student: "high_school", current_undergrad: "undergraduate", college: "undergraduate", college_student: "undergraduate",
  masters: "graduate", master: "graduate", masters_degree: "graduate", graduate_student: "graduate", postgraduate: "graduate",
  doctoral: "doctoral", doctorate: "doctoral", phd: "doctoral", certificate_program: "certificate",
};
function gradeToken(value: string): string { const t = token(value).replace(/^high_school_(freshman|sophomore|junior|senior)$/, "$1"); return grades[t] ?? t; }
const knownGrades = new Set(["freshman", "sophomore", "junior", "senior", "high_school", "undergraduate", "college_freshman", "college_sophomore", "college_junior", "college_senior", "graduate", "doctoral", "certificate"]);

/** Preserve every unsupported restriction for confirmation; never silently discard it. */
export function normalizeEligibility(value: unknown): CanonicalEligibility {
  const canonical = CanonicalEligibilitySchema.safeParse(value);
  if (canonical.success) return canonical.data;
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const handled = new Set<string>();
  const parseIssues: string[] = [];
  const issue = (keys: string[]) => parseIssues.push(`Confirm ${keys[0].replace(/_/g, " ")}: ${JSON.stringify(raw[keys.find((key) => raw[key] != null) ?? keys[0]])}`);
  const read = (...keys: string[]) => {
    keys.forEach((key) => handled.add(key));
    const present = keys.map((key) => raw[key]).filter((value) => value !== undefined && value !== null);
    if (new Set(present.map((value) => JSON.stringify(value))).size > 1) issue(keys);
    return present[0];
  };
  const list = (...keys: string[]) => {
    const value = read(...keys);
    if (value != null && typeof value !== "string" && (!Array.isArray(value) || value.some((item) => typeof item !== "string"))) issue(keys);
    return stringList(value);
  };
  const numeric = (...keys: string[]) => {
    const value = read(...keys); const parsed = number(value);
    if (value != null && (parsed === null || parsed < 0)) { issue(keys); return null; }
    return parsed;
  };
  const required = (...keys: string[]) => {
    const value = read(...keys); if (value != null && typeof value !== "boolean") issue(keys);
    return value === true;
  };
  const rawYears = read("graduation_years", "graduation_year");
  const yearValues = rawYears == null ? [] : Array.isArray(rawYears) ? rawYears : [rawYears];
  const years = yearValues.map(number);
  if (years.some((year) => year === null || !Number.isInteger(year))) issue(["graduation_years", "graduation_year"]);
  const gradeGroups = [list("grade_levels"), list("education_level", "education_levels")].filter((a) => a.length).map((a) => a.map(gradeToken));
  const result: CanonicalEligibility = {
    version: 1, gradeGroups, minGpa: numeric("min_gpa", "gpa_min"), states: list("states").map((s) => s.toUpperCase()),
    majors: list("majors").map(token), genders: list("genders", "gender").map(identity), ethnicities: list("ethnicities", "ethnicity").map(identity), demographics: list("demographics").map(identity),
    targetDegrees: list("target_degrees").map(token), excludedDegrees: list("excluded_degrees").map(token),
    schools: list("schools").map(schoolToken), alumniSchools: list("alumni_schools").map(schoolToken),
    attendance: list("attendance").map(token), studyModes: list("study_modes").map(token), enrollmentStatuses: list("enrollment_statuses").map(token),
    citizenship: list("citizenship_statuses").map(token), memberships: list("memberships"), sponsorships: list("sponsorships"),
    minAge: numeric("min_age", "age_min"), maxAge: numeric("max_age", "age_max"), ageAsOf: (read("age_as_of") as string | undefined) ?? null,
    graduationYears: years.filter((year): year is number => year !== null && Number.isInteger(year)),
    gapMonthsMin: numeric("education_gap_months_min"), completionMonthsMax: numeric("completion_months_max"),
    financialNeed: required("financial_need", "need_based"),
    firstGeneration: required("first_generation", "first_generation_required"),
    serviceRequired: required("service_required"), unresolved: list("other_requirements"),
  };
  const gapYears = numeric("education_gap_years_min");
  if (gapYears !== null) result.gapMonthsMin = Math.max(result.gapMonthsMin ?? 0, gapYears * 12);
  // Metadata never asserts eligibility. Complex prose stays visible as an unresolved rule.
  ["awards_available", "typical_age_range", "priority", "categories"].forEach((k) => handled.add(k));
  for (const [key, v] of Object.entries(raw)) {
    if (!handled.has(key) && v !== false && v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) result.unresolved.push(`${key.replace(/_/g, " ")}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  }
  if (value !== undefined && value !== null && (typeof value !== "object" || Array.isArray(value))) result.unresolved.push("Eligibility data needs review");
  result.unresolved.push(...parseIssues);
  return result;
}

export function assessEligibility(student: EligibilityStudent, award: EligibilityScholarship, now = new Date()): EligibilityAssessment {
  const rules = normalizeEligibility(award.eligibility);
  const education = parseEducationProfile(student.educationProfile);
  const reasons: string[] = [], missingFields: string[] = [], concerns: string[] = [];
  const fail = (message: string) => reasons.push(message);
  const unknown = (field: string, message: string) => { missingFields.push(field); concerns.push(message); };
  const check = (allowed: string[], actual: string | undefined | null, field: string, label: string, normalize = token) => {
    if (!allowed.length) return;
    if (!actual) unknown(field, `Confirm ${label}.`);
    else if (!allowed.map(normalize).includes(normalize(actual))) fail(`${label} does not meet the award's requirements.`);
  };
  const schoolGrade = student.gradeLevel ? gradeToken(student.gradeLevel) : null;
  const legacyLevel = schoolGrade?.startsWith("college_") ? "undergraduate" : ["freshman", "sophomore", "junior", "senior"].includes(schoolGrade ?? "") ? "high_school" : null;
  const targetLevel = education?.targetDegree === "master" ? "graduate" : education?.targetDegree === "doctorate" ? "doctoral" : ["bachelor", "associate"].includes(education?.targetDegree ?? "") ? "undergraduate" : education?.targetDegree === "certificate" ? "certificate" : null;
  const level = education?.educationLevel === "not_enrolled" ? targetLevel : education?.educationLevel ?? legacyLevel ?? targetLevel;
  for (const allowed of rules.gradeGroups) {
    if (allowed.includes(level ?? "") || allowed.includes(schoolGrade ?? "")) continue;
    if (!level || allowed.some((g) => !knownGrades.has(g)) || (!schoolGrade && allowed.some((g) => (g.startsWith("college_") && level === "undergraduate") || (["freshman", "sophomore", "junior", "senior"].includes(g) && level === "high_school")))) unknown("educationLevel", `Confirm education stage: ${allowed.join(", ")}.`);
    else fail("Education stage is not eligible for this award.");
  }
  if (rules.minGpa !== null) {
    if (student.gpa === null || student.gpa === undefined || student.gpa === "" || !Number.isFinite(Number(student.gpa))) unknown("gpa", `Minimum GPA is ${rules.minGpa}.`);
    else if (Number(student.gpaScale) !== 4) unknown("gpaScale", "Confirm an unweighted 4.0-scale GPA; weighted GPAs are not automatically converted.");
    else if (Number(student.gpa) < rules.minGpa) fail(`GPA is below the ${rules.minGpa} minimum.`);
  }
  check(rules.states, student.state, "state", "State");
  if (!award.national) check(award.states ?? [], student.state, "state", "State");
  if (rules.majors.length && !rules.majors.some((m) => ["all", "all_majors", "any"].includes(m))) {
    const major = student.intendedMajor ? token(student.intendedMajor) : null;
    if (!major) unknown("intendedMajor", "Confirm intended field of study.");
    else if (!rules.majors.includes(major)) {
      if (rules.majors.some((m) => ["stem", "related_fields", "social_sciences", "health_sciences"].includes(m))) unknown("intendedMajor", "Confirm whether your field meets the provider's field categories.");
      else fail("Field of study is outside the listed eligible fields.");
    }
  }
  check(rules.genders, student.gender, "gender", "Gender", identity);
  check(rules.ethnicities, student.ethnicity, "ethnicity", "Ethnicity", identity);
  if (rules.demographics.length && !rules.demographics.some((d) => [student.gender, student.ethnicity].filter(Boolean).map((v) => identity(v!)).includes(d))) {
    if (!student.gender || !student.ethnicity) unknown("demographics", "Confirm the award's demographic requirement."); else fail("Listed demographic requirement is not met.");
  }
  check(rules.targetDegrees, education?.targetDegree, "targetDegree", "Target degree");
  if (rules.excludedDegrees.length) {
    if (!education?.highestDegree) unknown("highestDegree", "Confirm previously earned degrees.");
    else if (rules.excludedDegrees.includes(education.highestDegree)) fail("A previously earned degree excludes this award.");
  }
  check(rules.attendance, education?.attendance, "attendance", "Full-time / part-time enrollment");
  check(rules.studyModes, education?.studyMode, "studyMode", "Study format");
  check(rules.enrollmentStatuses, education?.enrollmentStatus, "enrollmentStatus", "Application / enrollment status");
  if (rules.citizenship.length) {
    const citizen = education?.citizenship ? citizenshipToken(education.citizenship) : null;
    const allowed = rules.citizenship.map(citizenshipToken);
    if (!citizen || citizen === "other" || allowed.some((value) => value === null)) unknown("citizenship", "Confirm citizenship / residency against the provider's terms.");
    else if (!allowed.includes(citizen)) fail("Citizenship / residency status does not meet the award's requirements.");
  }
  for (const [allowed, actual, field, label] of [[rules.schools, education?.targetSchools, "targetSchools", "eligible school"], [rules.alumniSchools, education?.alumniSchools, "alumniSchools", "alumni school"]] as const) {
    if (allowed.length && !actual?.length) unknown(field, `Confirm ${label}.`);
    else if (allowed.length && !actual?.some((s) => allowed.includes(schoolToken(s)))) fail(`Requires an ${label}: ${allowed.join(", ").replace(/_/g, " ")}.`);
    else if (field === "targetSchools" && actual && actual.length > 1 && allowed.length) unknown("schoolSelection", "School-specific funding is conditional on choosing the eligible school.");
  }
  for (const [required, actual, field] of [[rules.memberships, education?.memberships, "memberships"], [rules.sponsorships, education?.sponsorships, "sponsorships"]] as const) {
    for (const item of required) if (!actual?.map(token).includes(token(item))) unknown(field, `Confirm required ${field}: ${item}.`);
  }
  if (rules.financialNeed) { if (!student.financialNeed) unknown("financialNeed", "Financial need must be established."); else if (student.financialNeed === "low") fail("Demonstrated financial need is required."); }
  if (rules.firstGeneration && student.firstGeneration !== true) { if (student.firstGeneration === false) fail("First-generation status is required."); else unknown("firstGeneration", "Confirm first-generation status."); }
  if (rules.serviceRequired && education?.serviceCommitment !== true) { if (education?.serviceCommitment === false) fail("The required service commitment was declined."); else unknown("serviceCommitment", "Review and confirm the required service commitment."); }
  if (rules.gapMonthsMin !== null) { if (education?.educationGapMonths === null || education?.educationGapMonths === undefined) unknown("educationGapMonths", "Confirm the consecutive education gap."); else if (education.educationGapMonths < rules.gapMonthsMin) fail(`Requires an education gap of at least ${rules.gapMonthsMin} months.`); }
  if (rules.completionMonthsMax !== null) {
    if (!education?.completionDate) unknown("completionDate", "Confirm the expected program completion date.");
    else { const end = new Date(`${education.completionDate}T23:59:59Z`); const limit = new Date(now); limit.setUTCMonth(limit.getUTCMonth() + rules.completionMonthsMax); if (end < now || end > limit) fail(`Must be within ${rules.completionMonthsMax} months of program completion.`); }
  }
  if (rules.graduationYears.length) { if (!student.graduationYear) unknown("graduationYear", "Confirm graduation year."); else if (!rules.graduationYears.includes(student.graduationYear)) fail("Graduation year does not meet the award's requirements."); }
  if (rules.minAge !== null || rules.maxAge !== null) {
    if (!education?.birthDate) unknown("birthDate", "An optional birth date is needed to check this award's age limit.");
    else { const birth = new Date(`${education.birthDate}T00:00:00Z`); const asOf = rules.ageAsOf ? new Date(rules.ageAsOf) : now; const age = asOf.getUTCFullYear() - birth.getUTCFullYear() - (asOf.getUTCMonth() < birth.getUTCMonth() || (asOf.getUTCMonth() === birth.getUTCMonth() && asOf.getUTCDate() < birth.getUTCDate()) ? 1 : 0); if ((rules.minAge !== null && age < rules.minAge) || (rules.maxAge !== null && age > rules.maxAge)) fail("Age does not meet the award's limits."); }
  }
  rules.unresolved.forEach((rule) => unknown("providerRequirements", `Provider confirmation: ${rule}`));
  if (["closed", "archived"].includes(award.status ?? "")) fail("This application cycle is closed.");
  if (award.deadline && new Date(award.deadline) < now) fail("The application deadline has passed.");
  const funding = parseFunding(award.funding);
  if (award.status === "upcoming" || funding?.deadlineType === "unannounced" || (funding?.opensOn && new Date(funding.opensOn) > now)) unknown("applicationCycle", "Applications are not confirmed open for the next cycle.");
  if (funding?.serviceObligation) concerns.push(`Service obligation: ${funding.serviceObligation}`);
  if (funding?.stackingPolicy) concerns.push(`Combining funding: ${funding.stackingPolicy}`);
  const verified = award.lastVerifiedAt ? new Date(award.lastVerifiedAt) : null;
  if (!award.source || !verified || Number.isNaN(verified.getTime()) || verified > now || now.getTime() - verified.getTime() > 90 * 86400000) unknown("verification", "Provider terms need current verification (within 90 days).");
  return { status: reasons.length ? "ineligible" : missingFields.length ? "needs_information" : "eligible", reasons: reasons.length ? reasons : missingFields.length ? ["Some eligibility requirements still need confirmation."] : ["Your profile meets the verified, listed criteria; the provider makes the final award decision."], missingFields: [...new Set(missingFields)], concerns: [...new Set(concerns)] };
}

/** Conservative award identity: punctuation/spacing and the documented PCE alias only. */
export function catalogKey(name: string, provider: string): string {
  const award = token(name).replace(/_pce(?=_|$)/g, "");
  return `${award.replace(/_/g, "")}::${token(provider).replace(/_/g, "")}`;
}

/** Map Supabase's stored names at one boundary so every results surface uses the same rules. */
export function assessStoredEligibility(student: Record<string, unknown>, award: Record<string, unknown> | null, now = new Date()): EligibilityAssessment {
  return assessEligibility({
    gpa: student.gpa as string | null, gpaScale: student.gpa_scale as string | null,
    gradeLevel: student.grade_level as string | null, graduationYear: student.graduation_year as number | null,
    state: student.state as string | null, intendedMajor: student.intended_major as string | null,
    gender: student.gender as string | null, ethnicity: student.ethnicity as string | null,
    financialNeed: student.financial_need as string | null, firstGeneration: student.first_generation as boolean | null,
    educationProfile: student.education_profile,
  }, award ? { eligibility: award.eligibility, states: award.states as string[] | null, national: award.national as boolean | null, deadline: award.deadline as string | null, status: award.status as string | null, source: award.source as string | null, lastVerifiedAt: award.last_verified_at as string | null, funding: award.funding } : {}, now);
}
