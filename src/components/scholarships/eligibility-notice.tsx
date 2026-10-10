import Link from "next/link";
import { eligibilityLabels, type EligibilityAssessment } from "@/lib/scholarships/eligibility";
export function EligibilityNotice({ assessment, compact = false }: { assessment: EligibilityAssessment; compact?: boolean }) {
  return <div className={`rounded-lg border p-3 text-sm ${assessment.status === "ineligible" ? "border-red-200 bg-red-50 text-red-900" : assessment.status === "needs_information" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-teal-200 bg-teal-50 text-teal-950"}`}>
    <p className="font-semibold">{eligibilityLabels[assessment.status]}</p>
    <ul className="mt-1 list-disc space-y-1 pl-4">{[...assessment.reasons, ...assessment.concerns].slice(0, compact ? 2 : undefined).map((reason) => <li key={reason}>{reason}</li>)}</ul>
    {!compact && assessment.missingFields.some((field) => !["verification", "providerRequirements", "applicationCycle"].includes(field)) && <Link href="/vault" className="mt-2 inline-block font-medium underline">Update your education profile</Link>}
    {!compact && <p className="mt-2 text-xs">Fit scores estimate relevance. They are not award probabilities or a funding promise.</p>}
  </div>;
}
