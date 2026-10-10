import Link from "next/link";
import { assessEligibility, normalizeEligibility } from "@/lib/scholarships/eligibility";
import { formatFunding, parseFunding, fundingKindLabels } from "@/lib/scholarships/funding";
import { EligibilityNotice } from "@/components/scholarships/eligibility-notice";
import { db } from "@/lib/db";
import {
  scholarships,
  scholarshipProviders,
  matches,
  studentProfiles,
  users,
} from "@/lib/db/schema";
import { eq, and, ne, desc, getTableColumns } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { MatchScore } from "@/components/scholarships/match-score";
import { ScholarshipCard } from "@/components/scholarships/scholarship-card";
import { ScholarshipActions } from "./actions-client";
import {
  Calendar,
  DollarSign,
  CheckCircle2,
  Circle,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScholarshipDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Fetch scholarship with provider
  const [scholarship] = await db
    .select({
      id: scholarships.id,
      name: scholarships.name,
      description: scholarships.description,
      amountMin: scholarships.amountMin,
      amountMax: scholarships.amountMax,
      deadline: scholarships.deadline,
      eligibility: scholarships.eligibility,
      funding: scholarships.funding,
      status: scholarships.status,
      source: scholarships.source,
      lastVerifiedAt: scholarships.lastVerifiedAt,
      requirements: scholarships.requirements,
      renewable: scholarships.renewable,
      national: scholarships.national,
      states: scholarships.states,
      tags: scholarships.tags,
      applicationUrl: scholarships.applicationUrl,
      providerName: scholarshipProviders.name,
    })
    .from(scholarships)
    .leftJoin(
      scholarshipProviders,
      eq(scholarships.providerId, scholarshipProviders.id),
    )
    .where(eq(scholarships.id, id))
    .limit(1);

  if (!scholarship) notFound();

  // Get student profile + match
  const [student] = await db
    .select({ ...getTableColumns(studentProfiles) })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, authUser.id))
    .limit(1);

  let match: {
    matchId: string;
    matchScore: number;
    affinityScore: number | null;
    matchReasons: string[] | null;
    matchStatus: string | null;
  } | null = null;

  if (student) {
    const [m] = await db
      .select({
        matchId: matches.id,
        matchScore: matches.matchScore,
        affinityScore: matches.affinityScore,
        matchReasons: matches.matchReasons,
        matchStatus: matches.status,
      })
      .from(matches)
      .where(
        and(eq(matches.studentId, student.id), eq(matches.scholarshipId, id)),
      )
      .limit(1);
    match = m ?? null;

    // Mark as viewed
    if (match && match.matchStatus === "new") {
      await db
        .update(matches)
        .set({ status: "viewed", updatedAt: new Date() })
        .where(eq(matches.id, match.matchId));
    }
  }

  // Similar scholarships
  const similar = student
    ? await db
        .select({
          matchId: matches.id,
          matchScore: matches.matchScore,
          matchReasons: matches.matchReasons,
          matchStatus: matches.status,
          scholarshipId: scholarships.id,
          scholarshipName: scholarships.name,
          amountMin: scholarships.amountMin,
          amountMax: scholarships.amountMax,
          deadline: scholarships.deadline,
          eligibility: scholarships.eligibility,
          funding: scholarships.funding,
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
          and(
            eq(matches.studentId, student.id),
            ne(matches.scholarshipId, id),
            ne(matches.status, "dismissed"),
          ),
        )
        .orderBy(desc(matches.matchScore))
        .limit(3)
    : [];

  const assessment = assessEligibility(student ?? {}, scholarship);
  const funding = parseFunding(scholarship.funding);
  const rules = normalizeEligibility(scholarship.eligibility);
  const rawReqs = (scholarship.requirements ?? {}) as Record<string, unknown>;
  const criteria = [
    rules.minGpa === null ? null : `Minimum GPA: ${rules.minGpa} (4.0 scale)`,
    ...rules.gradeGroups.map((group) => `Education stage: ${group.join(", ").replace(/_/g, " ")}`),
    ...([ ["Fields", rules.majors], ["Target degrees", rules.targetDegrees], ["Excluded prior degrees", rules.excludedDegrees], ["Schools", rules.schools], ["Alumni schools", rules.alumniSchools], ["Attendance", rules.attendance], ["Study format", rules.studyModes], ["Enrollment status", rules.enrollmentStatuses], ["Citizenship", rules.citizenship], ["Memberships", rules.memberships], ["Sponsorships", rules.sponsorships], ["Gender criteria", rules.genders], ["Ethnicity criteria", rules.ethnicities], ["Demographic criteria", rules.demographics], ["States", rules.states] ] as const).filter(([, values]) => values.length).map(([label, values]) => `${label}: ${values.join(", ").replace(/_/g, " ")}`),
    rules.financialNeed ? "Demonstrated financial need required" : null,
    rules.firstGeneration ? "First-generation status required" : null,
    rules.serviceRequired ? "Service commitment required" : null,
    rules.gapMonthsMin === null ? null : `Education gap: at least ${rules.gapMonthsMin} consecutive months`,
    rules.completionMonthsMax === null ? null : `Within ${rules.completionMonthsMax} months of completing the program`,
    rules.minAge === null ? null : `Minimum age: ${rules.minAge}`,
    rules.maxAge === null ? null : `Maximum age: ${rules.maxAge}`,
    ...rules.unresolved,
  ].filter((value): value is string => Boolean(value));
  const reqs = {
    transcript: rawReqs.transcript as boolean | undefined,
    essays_required: rawReqs.essays_required as number | undefined,
    recommendation_letters: rawReqs.recommendation_letters as
      | number
      | undefined,
    other: Array.isArray(rawReqs.other) ? rawReqs.other.filter((v): v is string => typeof v === "string") : typeof rawReqs.other === "string" ? [rawReqs.other] : [],
  };
  const deadline = scholarship.deadline ? new Date(scholarship.deadline) : null;
  const daysUntil = deadline
    ? Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-[var(--text-secondary)]">
        <Link href="/scholarships" className="hover:text-[var(--accent-teal)]">
          Scholarships
        </Link>
        <span className="mx-2">›</span>
        <span className="text-[var(--text-primary)]">{scholarship.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start gap-4">
              {match && <MatchScore score={match.matchScore} size="lg" />}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[var(--primary-navy)]">
                  {scholarship.name}
                </h1>
                {scholarship.providerName && (
                  <p className="mt-1 text-[var(--text-secondary)]">
                    {scholarship.providerName}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Badge
                    className="text-sm font-semibold px-3 py-1"
                    style={{
                      backgroundColor: "#D4A84320",
                      color: "#D4A843",
                      border: "1px solid #D4A84340",
                    }}
                  >
                    <DollarSign className="mr-1 h-3.5 w-3.5" />
                    {formatFunding(scholarship.amountMin, scholarship.amountMax, funding)}
                  </Badge>
                  {deadline && (
                    <Badge
                      variant="outline"
                      className={`text-sm ${daysUntil !== null && daysUntil <= 7 ? "border-[var(--error)] text-[var(--error)]" : daysUntil !== null && daysUntil <= 30 ? "border-[var(--warning)] text-[var(--warning)]" : ""}`}
                    >
                      <Calendar className="mr-1 h-3.5 w-3.5" />
                      {deadline.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {daysUntil !== null && daysUntil > 0 && (
                        <span className="ml-1">({daysUntil}d)</span>
                      )}
                    </Badge>
                  )}
                  {scholarship.renewable && (
                    <Badge variant="outline" className="text-sm">
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Renewable
                    </Badge>
                  )}
                  {!scholarship.national &&
                    (scholarship.states ?? []).length > 0 && (
                      <Badge variant="outline" className="text-sm">
                        <MapPin className="mr-1 h-3 w-3" />
                        {(scholarship.states ?? []).join(", ")}
                      </Badge>
                    )}
                </div>
              </div>
            </div>
          </div>

          <EligibilityNotice assessment={assessment} />
          {funding?.nextStep && (
            <section className="rounded-xl border border-accent-teal/30 bg-accent-teal/5 p-5" aria-labelledby="funding-next-step">
              <h2 id="funding-next-step" className="font-semibold text-text-primary">Your next step</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{funding.nextStep}</p>
            </section>
          )}
          {funding && <Card><CardHeader className="pb-3"><CardTitle className="text-base">{fundingKindLabels[funding.kind]} terms</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            {funding.amountDescription && <p>{funding.amountDescription}</p>}
            {funding.applicationCycle && <p><strong>Application cycle:</strong> {funding.applicationCycle}</p>}
            {funding.fundingTiming && <p><strong>When funding is available:</strong> {funding.fundingTiming}</p>}
            {funding.serviceObligation && <p><strong>Service obligation:</strong> {funding.serviceObligation}</p>}
            {funding.stackingPolicy && <p><strong>Combining awards:</strong> {funding.stackingPolicy}</p>}
            {funding.eligibleExpenses?.length ? <p><strong>Eligible costs:</strong> {funding.eligibleExpenses.join(", ")}</p> : null}
          </CardContent></Card>}
          <p className="text-xs text-[var(--text-secondary)]">{scholarship.source && <a href={scholarship.source} target="_blank" rel="noopener noreferrer" className="underline">Check provider terms</a>} / {scholarship.lastVerifiedAt ? `Source checked ${new Date(scholarship.lastVerifiedAt).toLocaleDateString("en-US")}` : "Source verification date unknown"}</p>

          {/* Match Reasons */}
          {match?.matchReasons && match.matchReasons.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Estimated Fit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {match.matchReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-teal)]" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {scholarship.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  About This Scholarship
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {scholarship.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Eligibility */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Eligibility Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {criteria.length ? criteria.map((criterion) => <EligibilityItem key={criterion} label={criterion} met={false} />) : <p className="text-sm">Check the provider&apos;s current eligibility rules.</p>}

            </CardContent>
          </Card>

          {/* Application Requirements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Application Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reqs.transcript && (
                <EligibilityItem label="Official transcript" met={false} />
              )}
              {reqs.essays_required != null && reqs.essays_required > 0 && (
                <EligibilityItem
                  label={`${reqs.essays_required} essay(s) required`}
                  met={false}
                />
              )}
              {reqs.recommendation_letters != null &&
                reqs.recommendation_letters > 0 && (
                  <EligibilityItem
                    label={`${reqs.recommendation_letters} recommendation letter(s)`}
                    met={false}
                  />
                )}
              {reqs.other?.map((req, i) => (
                <EligibilityItem key={i} label={req} met={false} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {match && (
            <ScholarshipActions
              matchId={match.matchId}
              scholarshipId={scholarship.id}
              applicationUrl={scholarship.applicationUrl}
              currentStatus={match.matchStatus ?? "new"}
            />
          )}

          <Separator />

          {/* Tags */}
          {scholarship.tags && scholarship.tags.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                Categories
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {scholarship.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs capitalize"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Similar Scholarships */}
          {similar.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                Similar Scholarships
              </h3>
              <div className="space-y-2">
                {similar.map((s) => (
                  <ScholarshipCard
                    key={s.matchId}
                    id={s.scholarshipId}
                    name={s.scholarshipName}
                    providerName={s.providerName ?? undefined}
                    funding={s.funding}
                    assessment={assessEligibility(student ?? {}, s)}
                    amountMin={s.amountMin}
                    amountMax={s.amountMax}
                    deadline={s.deadline}
                    matchScore={s.matchScore}
                    variant="compact"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EligibilityItem({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <Circle className="h-4 w-4 text-[var(--text-secondary)]" />
      )}
      <span
        className={
          met ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        }
      >
        {label}
      </span>
    </div>
  );
}
