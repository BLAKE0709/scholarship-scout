import { db } from "@/lib/db";
import { studentProfiles, scholarships, matches } from "@/lib/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import { filterEligible, scoreAffinity, rankMatches } from "./matching-engine";

export async function generateMatchesForStudent(
  studentId: string,
): Promise<{ matchCount: number; error?: string }> {
  try {
    // 1. Fetch student profile
    const [student] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, studentId))
      .limit(1);

    if (!student) {
      return { matchCount: 0, error: "Student profile not found" };
    }

    // 2. Fetch all active scholarships
    const allScholarships = await db
      .select()
      .from(scholarships)
      .where(eq(scholarships.status, "active"));

    if (allScholarships.length === 0) {
      return { matchCount: 0, error: "No active scholarships found" };
    }

    // 3. Stage 1: Eligibility filter
    const eligible = filterEligible(
      {
        id: student.id,
        userId: student.userId,
        gpa: student.gpa,
        gpaScale: student.gpaScale,
        satScore: student.satScore,
        actScore: student.actScore,
        graduationYear: student.graduationYear,
        state: student.state,
        city: student.city,
        gradeLevel: student.gradeLevel,
        intendedMajor: student.intendedMajor,
        interests: student.interests ?? [],
        extracurriculars: student.extracurriculars ?? [],
        ethnicity: student.ethnicity,
        gender: student.gender,
        firstGeneration: student.firstGeneration,
        financialNeed: student.financialNeed,
      },
      allScholarships.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        amountMin: s.amountMin,
        amountMax: s.amountMax,
        deadline: s.deadline,
        eligibility: (s.eligibility ?? {}) as Record<string, unknown>,
        requirements: (s.requirements ?? {}) as Record<string, unknown>,
        renewable: s.renewable,
        national: s.national,
        states: s.states ?? [],
        tags: s.tags ?? [],
      })),
    );

    console.log(
      `[MatchScheduler] ${eligible.length}/${allScholarships.length} scholarships eligible for student ${studentId}`,
    );

    // 4. Stage 2: Affinity scoring (batch with concurrency limit)
    const affinityResults = [];
    const batchSize = 5;

    for (let i = 0; i < eligible.length; i += batchSize) {
      const batch = eligible.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((s) =>
          scoreAffinity(
            {
              id: student.id,
              userId: student.userId,
              gpa: student.gpa,
              gpaScale: student.gpaScale,
              satScore: student.satScore,
              actScore: student.actScore,
              graduationYear: student.graduationYear,
              state: student.state,
              city: student.city,
              gradeLevel: student.gradeLevel,
              intendedMajor: student.intendedMajor,
              interests: student.interests ?? [],
              extracurriculars: student.extracurriculars ?? [],
              ethnicity: student.ethnicity,
              gender: student.gender,
              firstGeneration: student.firstGeneration,
              financialNeed: student.financialNeed,
            },
            s,
            studentId,
          ),
        ),
      );
      affinityResults.push(...batchResults);
    }

    // 5. Stage 3: Final ranking
    const ranked = rankMatches(affinityResults);

    // 6. Upsert matches to database
    for (const match of ranked) {
      const existing = await db
        .select({ id: matches.id, status: matches.status })
        .from(matches)
        .where(
          and(
            eq(matches.studentId, studentId),
            eq(matches.scholarshipId, match.scholarshipId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update scores but preserve status
        await db
          .update(matches)
          .set({
            matchScore: match.finalScore,
            affinityScore: match.affinityScore,
            matchReasons: match.reasons,
            updatedAt: new Date(),
          })
          .where(eq(matches.id, existing[0].id));
      } else {
        await db.insert(matches).values({
          studentId,
          scholarshipId: match.scholarshipId,
          matchScore: match.finalScore,
          affinityScore: match.affinityScore,
          matchReasons: match.reasons,
          status: "new",
        });
      }
    }

    // Prune stale matches: rows whose scholarship no longer passes eligibility
    // (data corrections, profile changes, expired deadlines). Only untouched
    // 'new' rows are removed — anything the student saved, applied to, or
    // dismissed reflects their judgment and stays.
    const keepIds = ranked.map((m) => m.scholarshipId);
    const stale = await db
      .delete(matches)
      .where(
        keepIds.length > 0
          ? and(
              eq(matches.studentId, studentId),
              eq(matches.status, "new"),
              notInArray(matches.scholarshipId, keepIds),
            )
          : and(eq(matches.studentId, studentId), eq(matches.status, "new")),
      )
      .returning({ id: matches.id });

    console.log(
      `[MatchScheduler] Generated ${ranked.length} matches for student ${studentId} (${stale.length} stale pruned)`,
    );

    return { matchCount: ranked.length };
  } catch (error) {
    console.error("[MatchScheduler] Error:", error);
    return {
      matchCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
