import { db } from "@/lib/db";
import {
  scholarships,
  scholarshipProviders,
  matches,
  studentProfiles,
  users,
} from "@/lib/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { MatchScore } from "@/components/scholarships/match-score";
import { ScholarshipCard } from "@/components/scholarships/scholarship-card";
import { ScholarshipActions } from "./actions-client";
import {
  Calendar,
  DollarSign,
  ExternalLink,
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
    .select({ id: studentProfiles.id })
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

  const rawElig = (scholarship.eligibility ?? {}) as Record<string, unknown>;
  const rawReqs = (scholarship.requirements ?? {}) as Record<string, unknown>;
  const elig = {
    min_gpa: rawElig.min_gpa as number | undefined,
    grade_levels: rawElig.grade_levels as string[] | undefined,
    majors: rawElig.majors as string[] | undefined,
    financial_need: rawElig.financial_need as boolean | undefined,
    demographics: rawElig.demographics as string[] | undefined,
    other_requirements: rawElig.other_requirements as string[] | undefined,
  };
  const reqs = {
    transcript: rawReqs.transcript as boolean | undefined,
    essays_required: rawReqs.essays_required as number | undefined,
    recommendation_letters: rawReqs.recommendation_letters as
      | number
      | undefined,
    other: rawReqs.other as string[] | undefined,
  };
  const deadline = scholarship.deadline ? new Date(scholarship.deadline) : null;
  const daysUntil = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-[var(--text-secondary)]">
        <a href="/scholarships" className="hover:text-[var(--accent-teal)]">
          Scholarships
        </a>
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
                    {scholarship.amountMin.toLocaleString()}
                    {scholarship.amountMax &&
                    scholarship.amountMax !== scholarship.amountMin
                      ? ` – $${scholarship.amountMax.toLocaleString()}`
                      : ""}
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

          {/* Match Reasons */}
          {match?.matchReasons && match.matchReasons.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Why This Matches You
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
              {elig.min_gpa != null && (
                <EligibilityItem
                  label={`Minimum GPA: ${elig.min_gpa}`}
                  met={true}
                />
              )}
              {elig.grade_levels && elig.grade_levels.length > 0 && (
                <EligibilityItem
                  label={`Grade Level: ${elig.grade_levels.join(", ")}`}
                  met={true}
                />
              )}
              {elig.majors && elig.majors.length > 0 && (
                <EligibilityItem
                  label={`Target Majors: ${elig.majors.join(", ")}`}
                  met={true}
                />
              )}
              {elig.financial_need === true && (
                <EligibilityItem label="Financial need required" met={true} />
              )}
              {elig.demographics && elig.demographics.length > 0 && (
                <EligibilityItem
                  label={`Demographics: ${elig.demographics.join(", ")}`}
                  met={true}
                />
              )}
              {elig.other_requirements?.map((req, i) => (
                <EligibilityItem key={i} label={req} met={false} />
              ))}
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
