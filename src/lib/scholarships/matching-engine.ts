import { aiGateway } from "@/lib/ai/gateway";
import { assessEligibility, normalizeEligibility, token, type EligibilityAssessment } from "./eligibility";
import { parseEducationProfile } from "../profiles/education";
import { formatFunding } from "./funding";
import { MatchScoringResponseSchema } from "@/lib/ai/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StudentProfile {
  educationProfile?: unknown;
  id: string;
  userId: string;
  gpa: string | null;
  gpaScale: string | null;
  satScore: number | null;
  actScore: number | null;
  graduationYear: number | null;
  state: string;
  city: string | null;
  gradeLevel: string | null;
  intendedMajor: string | null;
  interests: string[];
  extracurriculars: string[];
  ethnicity: string | null;
  gender: string | null;
  firstGeneration: boolean | null;
  financialNeed: string | null;
}

export interface Scholarship {
  funding?: unknown;
  status?: string | null;
  source?: string | null;
  lastVerifiedAt?: Date | string | null;
  id: string;
  name: string;
  description: string | null;
  amountMin: number;
  amountMax: number | null;
  deadline: Date | null;
  eligibility: Record<string, unknown>;
  requirements: Record<string, unknown>;
  renewable: boolean | null;
  national: boolean | null;
  states: string[];
  tags: string[];
}

export interface AffinityResult {
  assessment: EligibilityAssessment;
  scholarship: Scholarship;
  affinityScore: number;
  reasons: string[];
  concerns: string[];
}

export interface RankedMatch {
  assessment: EligibilityAssessment;
  scholarshipId: string;
  scholarship: Scholarship;
  finalScore: number;
  affinityScore: number;
  urgencyScore: number;
  amountScore: number;
  simplicityScore: number;
  reasons: string[];
  concerns: string[];
}

// ── Stage 1: Eligibility Filter ──────────────────────────────────────────────

/** Unknowns stay discoverable; only known disqualifications are filtered out. */
export function filterEligible(student: StudentProfile, allScholarships: Scholarship[]): Scholarship[] {
  return allScholarships.filter((award) => assessEligibility(student, award).status !== "ineligible");
}

export async function scoreAffinity(
  student: StudentProfile,
  scholarship: Scholarship,
  studentId?: string,
): Promise<AffinityResult> {
  const assessment = assessEligibility(student, scholarship);
  // Profiles using the new education model are ranked locally. No new adult
  // facts or eligibility predicates are forwarded to an external AI provider.
  if (parseEducationProfile(student.educationProfile)) {
    return { scholarship, assessment, affinityScore: calculateFallbackScore(student, scholarship), reasons: ["Estimated fit based on your profile and the listed award criteria"], concerns: [] };
  }
  const studentSummary = buildStudentSummary(student);
  const scholarshipSummary = buildScholarshipSummary(scholarship);

  try {
    const response = await aiGateway.call({
      purpose: "match_scoring",
      prompt: `Rank affinity only. Do not assert or override eligibility. Evaluate how well this student matches this scholarship.\n\nSTUDENT PROFILE:\n${studentSummary}\n\nSCHOLARSHIP:\n${scholarshipSummary}`,
      studentId,
    });

    const jsonStr = extractJSON(response.content);
    const parsed = MatchScoringResponseSchema.safeParse(JSON.parse(jsonStr));

    if (parsed.success) {
      return {
        scholarship,
        assessment,
        affinityScore: parsed.data.affinity_score,
        reasons: parsed.data.reasons,
        concerns: parsed.data.concerns,
      };
    }
  } catch (error) {
    console.error(
      `[MatchEngine] Affinity scoring failed for "${scholarship.name}":`,
      error,
    );
  }

  // Fallback: deterministic scoring if AI fails
  return {
    scholarship,
    assessment,
    affinityScore: calculateFallbackScore(student, scholarship),
    reasons: ["Estimated fit based on the available profile"],
    concerns: ["AI scoring unavailable — using estimated score"],
  };
}

// ── Stage 3: Final Ranking ───────────────────────────────────────────────────

export function rankMatches(affinityResults: AffinityResult[]): RankedMatch[] {
  const now = new Date();

  return affinityResults
    .map((ar) => {
      const { scholarship, affinityScore, reasons, concerns, assessment } = ar;

      // Deadline urgency (25%): exponential decay, closer = higher
      let urgencyScore = 50;
      if (scholarship.deadline) {
        const daysUntil = Math.max(
          0,
          (new Date(scholarship.deadline).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysUntil <= 7) urgencyScore = 100;
        else if (daysUntil <= 30) urgencyScore = 85;
        else if (daysUntil <= 90) urgencyScore = 60;
        else urgencyScore = 30;
      }

      // Amount score (15%): normalized, higher = better
      const maxAmount = scholarship.amountMax ?? scholarship.amountMin;
      const amountScore = Math.min(100, (maxAmount / 50000) * 100);

      // Simplicity score (10%): fewer requirements = higher
      const reqs = scholarship.requirements as Record<string, unknown>;
      const essayCount = (reqs.essays_required as number) ?? 0;
      const recLetters = (reqs.recommendation_letters as number) ?? 0;
      const otherReqs = Array.isArray(reqs.other) ? reqs.other.length : reqs.other ? 1 : 0;
      const totalReqs = essayCount + recLetters + otherReqs;
      const simplicityScore = Math.max(0, 100 - totalReqs * 20);

      // Weighted final score
      const finalScore = Math.round(
        affinityScore * 0.5 +
          urgencyScore * 0.25 +
          amountScore * 0.15 +
          simplicityScore * 0.1,
      );

      return {
        assessment,
        scholarshipId: scholarship.id,
        scholarship,
        finalScore,
        affinityScore,
        urgencyScore,
        amountScore,
        simplicityScore,
        reasons,
        concerns,
      };
    })
    .sort((a, b) => Number(b.assessment.status === "eligible") - Number(a.assessment.status === "eligible") || b.finalScore - a.finalScore);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildStudentSummary(s: StudentProfile): string {
  const lines: string[] = [];
  if (s.gpa) lines.push(`GPA: ${s.gpa}/${s.gpaScale ?? "4.0"}`);
  if (s.satScore) lines.push(`SAT: ${s.satScore}`);
  if (s.actScore) lines.push(`ACT: ${s.actScore}`);
  if (s.gradeLevel) lines.push(`Grade: ${s.gradeLevel}`);
  lines.push(`State: ${s.state}`);
  if (s.intendedMajor) lines.push(`Intended Major: ${s.intendedMajor}`);
  if (s.interests.length) lines.push(`Interests: ${s.interests.join(", ")}`);
  if (s.extracurriculars.length)
    lines.push(`Extracurriculars: ${s.extracurriculars.join(", ")}`);
  if (s.ethnicity) lines.push(`Ethnicity: ${s.ethnicity}`);
  if (s.gender) lines.push(`Gender: ${s.gender}`);
  if (s.firstGeneration) lines.push(`First Generation: Yes`);
  if (s.financialNeed) lines.push(`Financial Need: ${s.financialNeed}`);
  return lines.join("\n");
}

function buildScholarshipSummary(s: Scholarship): string {
  const lines: string[] = [
    `Name: ${s.name}`,
    `Amount: ${formatFunding(s.amountMin, s.amountMax, s.funding)}`,
    `Funding terms: ${JSON.stringify(s.funding ?? {})}`,
    `Eligibility rules: ${JSON.stringify(normalizeEligibility(s.eligibility))}`,
  ];
  if (s.description) lines.push(`Description: ${s.description}`);
  if (s.deadline)
    lines.push(`Deadline: ${new Date(s.deadline).toLocaleDateString()}`);
  if (s.tags.length) lines.push(`Categories: ${s.tags.join(", ")}`);
  if (s.renewable) lines.push(`Renewable: Yes`);
  const elig = s.eligibility as Record<string, unknown>;
  if (elig.min_gpa) lines.push(`Min GPA: ${elig.min_gpa}`);
  const majors = elig.majors as string[] | undefined;
  if (majors?.length) lines.push(`Target Majors: ${majors.join(", ")}`);
  return lines.join("\n");
}

function extractJSON(text: string): string {
  // Try to extract JSON from the response, handling markdown fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find raw JSON object
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];

  return text;
}

function calculateFallbackScore(
  student: StudentProfile,
  scholarship: Scholarship,
): number {
  let score = 50;

  // GPA bonus
  if (student.gpa) {
    const gpa = parseFloat(student.gpa);
    if (gpa >= 3.8) score += 15;
    else if (gpa >= 3.5) score += 10;
    else if (gpa >= 3.0) score += 5;
  }

  // Major alignment
  const majors = normalizeEligibility(scholarship.eligibility).majors;
  if (
    majors?.length &&
    student.intendedMajor &&
    majors.some((m) =>
      m === token(student.intendedMajor!),
    )
  ) {
    score += 15;
  }

  // State match
  if (scholarship.national || scholarship.states.includes(student.state)) {
    score += 5;
  }

  return Math.min(100, score);
}
