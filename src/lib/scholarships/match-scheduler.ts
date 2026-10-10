import { db } from "@/lib/db";
import { studentProfiles, scholarships, matches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { scoreAffinity, rankMatches, type Scholarship } from "./matching-engine";
import { assessEligibility } from "./eligibility";

export async function generateMatchesForStudent(studentId: string): Promise<{ matchCount: number; error?: string }> {
  try {
    const [row] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, studentId)).limit(1);
    if (!row) return { matchCount: 0, error: "Student profile not found" };
    const student = { ...row, interests: row.interests ?? [], extracurriculars: row.extracurriculars ?? [] };
    // Include closed awards to reassess saved/applied history without deleting that history.
    const all = await db.select().from(scholarships);
    // Never delete matches: even status=new can be referenced by a draft application.
    const existing = await db.select().from(matches).where(eq(matches.studentId, studentId));
    const byScholarship = new Map(existing.map((match) => [match.scholarshipId, match]));
    const candidates: Scholarship[] = [];
    for (const row of all) {
      const award = { ...row, eligibility: (row.eligibility ?? {}) as Record<string, unknown>, requirements: (row.requirements ?? {}) as Record<string, unknown>, states: row.states ?? [], tags: row.tags ?? [] };
      const assessment = assessEligibility(student, award);
      const old = byScholarship.get(award.id);
      if (assessment.status === "ineligible") {
        if (old) await db.update(matches).set({ eligibilityStatus: assessment.status, eligibilityReasons: assessment.reasons, eligibilityMissingFields: assessment.missingFields, matchConcerns: assessment.concerns, updatedAt: new Date() }).where(eq(matches.id, old.id));
      } else candidates.push(award);
    }
    const affinities = [];
    for (let index = 0; index < candidates.length; index += 5) {
      affinities.push(...await Promise.all(candidates.slice(index, index + 5).map((award) => scoreAffinity(student, award, studentId))));
    }
    const ranked = rankMatches(affinities);
    for (const match of ranked) {
      const values = { matchScore: match.finalScore, affinityScore: match.affinityScore, matchReasons: match.reasons, eligibilityStatus: match.assessment.status, eligibilityReasons: match.assessment.reasons, eligibilityMissingFields: match.assessment.missingFields, matchConcerns: [...new Set([...match.assessment.concerns, ...match.concerns])], updatedAt: new Date() };
      // Unique index makes repeated / concurrent refreshes idempotent; workflow status is untouched.
      await db.insert(matches).values({ studentId, scholarshipId: match.scholarshipId, ...values, status: "new" }).onConflictDoUpdate({ target: [matches.studentId, matches.scholarshipId], set: values });
    }
    return { matchCount: ranked.length };
  } catch (error) {
    console.error("[MatchScheduler] Error:", error);
    return { matchCount: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
