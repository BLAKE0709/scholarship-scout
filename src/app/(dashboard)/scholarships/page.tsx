import { assessEligibility, token } from "@/lib/scholarships/eligibility";
import { RefreshMatches } from "@/components/scholarships/refresh-matches";
import { db } from "@/lib/db";
import {
  matches,
  scholarships,
  scholarshipProviders,
  studentProfiles,
  users,
} from "@/lib/db/schema";
import { eq, and, ne, desc, asc, arrayContains, getTableColumns } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FundingExplorer } from "@/components/scholarships/funding-explorer";
import { GraduateFundingList } from "@/components/scholarships/graduate-funding-list";
import { parseEducationProfile } from "@/lib/profiles/education";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function ScholarshipsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Get student profile
  const [student] = await db
    .select({ ...getTableColumns(studentProfiles) })
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
  const storedMatches = await db
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
      funding: scholarships.funding,
      eligibility: scholarships.eligibility,
      national: scholarships.national,
      states: scholarships.states,
      status: scholarships.status,
      source: scholarships.source,
      lastVerifiedAt: scholarships.lastVerifiedAt,
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

  const studentMatches = storedMatches.map((match) => ({ ...match, assessment: assessEligibility(student, match) }))
    .filter((match) => match.assessment.status !== "ineligible" || match.matchStatus !== "new")
    .sort((a, b) => Number(b.assessment.status === "eligible") - Number(a.assessment.status === "eligible") || Number(a.assessment.status === "ineligible") - Number(b.assessment.status === "ineligible") || b.matchScore - a.matchScore);

  const education = parseEducationProfile(student.educationProfile);
  const graduate = education?.educationLevel === "graduate" || education?.educationLevel === "doctoral" || education?.targetDegree === "master" || education?.targetDegree === "doctorate";
  const fundingList = graduate && token(student.intendedMajor ?? "") === "social_work"
    ? await db.select({
        id: scholarships.id, name: scholarships.name, description: scholarships.description,
        amountMin: scholarships.amountMin, amountMax: scholarships.amountMax,
        funding: scholarships.funding, tags: scholarships.tags, source: scholarships.source,
        eligibility: scholarships.eligibility, status: scholarships.status, deadline: scholarships.deadline,
        lastVerifiedAt: scholarships.lastVerifiedAt, national: scholarships.national, states: scholarships.states,
        providerName: scholarshipProviders.name,
      }).from(scholarships)
        .leftJoin(scholarshipProviders, eq(scholarships.providerId, scholarshipProviders.id))
        .where(and(arrayContains(scholarships.tags, ["msw-funding-list"]), ne(scholarships.status, "archived")))
        .orderBy(asc(scholarships.name))
    : [];


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-navy">{graduate ? "Graduate funding" : "Scholarships & funding"}</h1>
        <p className="mt-1 text-text-secondary">Find support that fits your education, work, and next chapter.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <RefreshMatches />
        <Link href="/vault" className="text-sm font-medium text-accent-teal underline underline-offset-4">Edit your profile</Link>
      </div>
      <GraduateFundingList awards={fundingList.map((award) => ({ ...award, assessment: assessEligibility(student, award) }))} />
      <FundingExplorer
        graduate={graduate}
        matches={studentMatches.map((match) => ({
          id: match.scholarshipId,
          name: match.scholarshipName,
          providerName: match.providerName ?? undefined,
          funding: match.funding,
          assessment: match.assessment,
          amountMin: match.amountMin,
          amountMax: match.amountMax,
          deadline: match.deadline,
          matchScore: match.matchScore,
          reasons: match.matchReasons ?? undefined,
          status: match.matchStatus ?? undefined,
          tags: match.tags ?? undefined,
        }))}
      />
      <p className="text-xs leading-relaxed text-text-secondary">Awards are competitive. A tuition discount, service stipend, and cash award have different terms. Confirm eligibility and whether awards can combine before including them in your budget.</p>
    </div>
  );
}
