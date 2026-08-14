import { db } from "@/lib/db";
import {
  matches,
  scholarships,
  scholarshipProviders,
  studentProfiles,
  users,
} from "@/lib/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScholarshipCard } from "@/components/scholarships/scholarship-card";
import { Search } from "lucide-react";

export default async function ScholarshipsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Get student profile
  const [student] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-teal)]/10">
          <Search className="h-8 w-8 text-[var(--accent-teal)]" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          Complete your profile to see matches
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          We need to know a bit about you before we can find the best
          scholarship matches. Complete your profile in settings to get started.
        </p>
      </div>
    );
  }

  // Fetch matches
  const studentMatches = await db
    .select({
      matchId: matches.id,
      matchScore: matches.matchScore,
      affinityScore: matches.affinityScore,
      matchReasons: matches.matchReasons,
      matchStatus: matches.status,
      scholarshipId: scholarships.id,
      scholarshipName: scholarships.name,
      description: scholarships.description,
      amountMin: scholarships.amountMin,
      amountMax: scholarships.amountMax,
      deadline: scholarships.deadline,
      tags: scholarships.tags,
      renewable: scholarships.renewable,
      providerName: scholarshipProviders.name,
    })
    .from(matches)
    .innerJoin(scholarships, eq(matches.scholarshipId, scholarships.id))
    .leftJoin(
      scholarshipProviders,
      eq(scholarships.providerId, scholarshipProviders.id),
    )
    .where(
      and(eq(matches.studentId, student.id), ne(matches.status, "dismissed")),
    )
    .orderBy(desc(matches.matchScore));

  if (studentMatches.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary-navy)]">
            Scholarships
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Your personalized scholarship matches
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-light)] py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-teal)]/10">
            <Search className="h-7 w-7 text-[var(--accent-teal)]" />
          </div>
          <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
            No matches yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
            Matches are being generated. Refresh this page in a moment, or
            trigger matching from the API.
          </p>
        </div>
      </div>
    );
  }

  const topMatches = studentMatches.slice(0, 5);
  const allMatches = studentMatches;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--primary-navy)]">
          Scholarships
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          {studentMatches.length} scholarships matched to your profile
        </p>
      </div>

      {/* Top Matches */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Your Top Matches
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topMatches.map((m) => (
            <ScholarshipCard
              key={m.matchId}
              id={m.scholarshipId}
              name={m.scholarshipName}
              providerName={m.providerName ?? undefined}
              amountMin={m.amountMin}
              amountMax={m.amountMax}
              deadline={m.deadline}
              matchScore={m.matchScore}
              reasons={m.matchReasons ?? undefined}
              status={m.matchStatus ?? undefined}
              tags={m.tags ?? undefined}
            />
          ))}
        </div>
      </section>

      {/* All Matches */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          All Matches
        </h2>
        <div className="space-y-3">
          {allMatches.map((m) => (
            <ScholarshipCard
              key={m.matchId}
              id={m.scholarshipId}
              name={m.scholarshipName}
              providerName={m.providerName ?? undefined}
              amountMin={m.amountMin}
              amountMax={m.amountMax}
              deadline={m.deadline}
              matchScore={m.matchScore}
              reasons={m.matchReasons ?? undefined}
              status={m.matchStatus ?? undefined}
              tags={m.tags ?? undefined}
              variant="compact"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
