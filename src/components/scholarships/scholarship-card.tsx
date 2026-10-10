"use client";

import Link from "next/link";
import { Calendar, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchScore } from "./match-score";
import { formatFunding, parseFunding, fundingKindLabels } from "@/lib/scholarships/funding";
import { eligibilityLabels, type EligibilityAssessment } from "@/lib/scholarships/eligibility";

export interface ScholarshipCardProps {
  funding?: unknown;
  assessment?: EligibilityAssessment;
  id: string;
  name: string;
  providerName?: string;
  amountMin: number;
  amountMax?: number | null;
  deadline?: Date | string | null;
  matchScore: number;
  reasons?: string[];
  status?: string;
  tags?: string[];
  variant?: "compact" | "full";
}

function getDeadlineInfo(
  deadline?: Date | string | null,
): { text: string; color: string; urgent: boolean } | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const daysUntil = Math.ceil(
    (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntil < 0)
    return { text: "Expired", color: "text-[var(--error)]", urgent: true };
  if (daysUntil <= 7)
    return {
      text: `${daysUntil}d left`,
      color: "text-[var(--error)]",
      urgent: true,
    };
  if (daysUntil <= 30)
    return {
      text: `${daysUntil}d left`,
      color: "text-[var(--warning)]",
      urgent: false,
    };
  return {
    text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    color: "text-[var(--text-secondary)]",
    urgent: false,
  };
}

export function ScholarshipCard({
  id,
  funding,
  assessment,
  name,
  providerName,
  amountMin,
  amountMax,
  deadline,
  matchScore,
  reasons,
  status,
  tags,
  variant = "full",
}: ScholarshipCardProps) {
  const terms = parseFunding(funding);
  const deadlineInfo = getDeadlineInfo(deadline);
  const isCompact = variant === "compact";

  return (
    <Link href={`/scholarships/${id}`}>
      <Card className="group transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer border-[var(--border-light)]">
        <CardContent className={isCompact ? "p-4" : "p-5"}>
          <div className="flex items-start gap-4">
            <MatchScore score={matchScore} size={isCompact ? "sm" : "md"} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className={`font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-teal)] transition-colors ${isCompact ? "text-sm" : "text-base"}`}
                  >
                    {name}
                  </h3>
                  {providerName && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {providerName}
                    </p>
                  )}
                </div>
                {status && status !== "new" && (
                  <Badge
                    variant="secondary"
                    className="text-xs shrink-0 capitalize"
                  >
                    {status}
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3 text-sm">
                <span
                  className="flex items-center gap-1 font-semibold"
                  style={{ color: "#D4A843" }}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatFunding(amountMin, amountMax ?? null, funding)}
                </span>
                {deadlineInfo && (
                  <span
                    className={`flex items-center gap-1 ${deadlineInfo.color}`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {deadlineInfo.text}
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1 text-xs">
                <p className="font-medium">{terms ? fundingKindLabels[terms.kind] : "Scholarship"} / {eligibilityLabels[assessment?.status ?? "needs_information"]}</p>
                {assessment?.status !== "eligible" && <p className="text-[var(--text-secondary)]">{assessment?.status === "ineligible" ? assessment.reasons[0] : assessment?.concerns[0] ?? "Eligibility has not been verified."}</p>}
                {terms?.serviceObligation && <p className="text-amber-800">Service commitment required</p>}
                <p className="text-[var(--text-secondary)]">Score estimates fit, not award likelihood.</p>
              </div>

              {!isCompact && terms?.nextStep && (
                <p className="mt-3 border-t border-border-light pt-3 text-sm text-text-secondary">
                  <strong className="text-text-primary">Next step:</strong> {terms.nextStep}
                </p>
              )}

              {!isCompact && reasons && reasons.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {reasons.slice(0, 2).map((reason, i) => (
                    <span
                      key={i}
                      className="inline-block rounded-full bg-[var(--accent-teal)]/5 px-2.5 py-0.5 text-xs text-[var(--accent-teal)]"
                    >
                      {reason.length > 50
                        ? reason.slice(0, 47) + "..."
                        : reason}
                    </span>
                  ))}
                </div>
              )}

              {!isCompact && tags && tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
