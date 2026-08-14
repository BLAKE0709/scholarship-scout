import { aiGateway } from "@/lib/ai/gateway";
import { MatchScoringResponseSchema } from "@/lib/ai/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: string;
  userId: string;
  gpa: string | null;
  gpaScale: string | null;
  satScore: number | null;
  actScore: number | null;
  graduationYear: number;
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

interface Scholarship {
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
  scholarship: Scholarship;
  affinityScore: number;
  reasons: string[];
  concerns: string[];
}

export interface RankedMatch {
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

// Seed data and app profiles use overlapping but non-identical vocabularies
// (e.g. "high_school_senior" vs "senior", "gpa_min" vs "min_gpa"). Normalize
// both sides so eligibility actually bites — a filter that silently no-ops is
// worse than none, because it looks like it's working.
const HS_GRADES = new Set(["freshman", "sophomore", "junior", "senior"]);

function normalizeGradeToken(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/^high_school_/, "");
}

function gradeMatches(seedTokens: string[], studentGrade: string): boolean {
  const student = normalizeGradeToken(studentGrade);
  const studentIsHS = HS_GRADES.has(student);
  const studentIsCollege = student.startsWith("college_");

  return seedTokens.some((t) => {
    const token = normalizeGradeToken(t);
    if (token === student) return true;
    // Group tokens used across the seed data
    if (
      (token === "high_school" || token === "high_school_student") &&
      studentIsHS
    )
      return true;
    if (
      (token === "undergraduate" ||
        token === "current_undergrad" ||
        token === "college" ||
        token === "college_student") &&
      studentIsCollege
    )
      return true;
    return false;
  });
}

export function filterEligible(
  student: StudentProfile,
  allScholarships: Scholarship[],
): Scholarship[] {
  return allScholarships.filter((s) => {
    const elig = s.eligibility as Record<string, unknown>;

    // GPA check — seed data writes gpa_min, older records min_gpa
    const minGpa = (elig.min_gpa ?? elig.gpa_min) as number | undefined;
    if (minGpa && student.gpa) {
      if (parseFloat(student.gpa) < minGpa) return false;
    }

    // State check (skip if national or no state restriction)
    if (!s.national && s.states && s.states.length > 0) {
      if (!s.states.includes(student.state)) return false;
    }

    // Grade level check — vocabulary-normalized; a grade-restricted award
    // that names no grade the student occupies is excluded.
    const gradeLevels = elig.grade_levels as string[] | undefined;
    if (gradeLevels && gradeLevels.length > 0 && student.gradeLevel) {
      if (!gradeMatches(gradeLevels, student.gradeLevel)) return false;
    }

    // Financial need check
    if (elig.financial_need === true) {
      if (!student.financialNeed || student.financialNeed === "low")
        return false;
    }

    // Demographics check (match if any demographic applies)
    const demographics = elig.demographics as string[] | undefined;
    if (demographics && demographics.length > 0) {
      const studentDemo = [
        student.ethnicity?.toLowerCase(),
        student.gender?.toLowerCase(),
      ].filter(Boolean);
      const hasMatch = demographics.some((d) =>
        studentDemo.some(
          (sd) =>
            sd &&
            (sd.includes(d.toLowerCase()) || d.toLowerCase().includes(sd)),
        ),
      );
      if (!hasMatch) return false;
    }

    // Deadline check — skip expired scholarships
    if (s.deadline && new Date(s.deadline) < new Date()) return false;

    return true;
  });
}

// ── Stage 2: Affinity Scoring ────────────────────────────────────────────────

export async function scoreAffinity(
  student: StudentProfile,
  scholarship: Scholarship,
  studentId?: string,
): Promise<AffinityResult> {
  const studentSummary = buildStudentSummary(student);
  const scholarshipSummary = buildScholarshipSummary(scholarship);

  try {
    const response = await aiGateway.call({
      purpose: "match_scoring",
      prompt: `Evaluate how well this student matches this scholarship.\n\nSTUDENT PROFILE:\n${studentSummary}\n\nSCHOLARSHIP:\n${scholarshipSummary}`,
      studentId,
    });

    const jsonStr = extractJSON(response.content);
    const parsed = MatchScoringResponseSchema.safeParse(JSON.parse(jsonStr));

    if (parsed.success) {
      return {
        scholarship,
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
    affinityScore: calculateFallbackScore(student, scholarship),
    reasons: ["Meets basic eligibility requirements"],
    concerns: ["AI scoring unavailable — using estimated score"],
  };
}

// ── Stage 3: Final Ranking ───────────────────────────────────────────────────

export function rankMatches(affinityResults: AffinityResult[]): RankedMatch[] {
  const now = new Date();

  return affinityResults
    .map((ar) => {
      const { scholarship, affinityScore, reasons, concerns } = ar;

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
      const otherReqs = (reqs.other as string[])?.length ?? 0;
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
    .sort((a, b) => b.finalScore - a.finalScore);
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
    `Amount: $${s.amountMin.toLocaleString()}${s.amountMax ? ` - $${s.amountMax.toLocaleString()}` : ""}`,
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
  const majors = (scholarship.eligibility as Record<string, unknown>).majors as
    string[] | undefined;
  if (
    majors?.length &&
    student.intendedMajor &&
    majors.some((m) =>
      m.toLowerCase().includes(student.intendedMajor!.toLowerCase()),
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
