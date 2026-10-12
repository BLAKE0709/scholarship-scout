import Link from "next/link";
import { eligibilityLabels, type EligibilityAssessment } from "@/lib/scholarships/eligibility";
import { formatFunding, parseFunding } from "@/lib/scholarships/funding";

export interface GraduateFundingEntry {
  id: string;
  name: string;
  description: string | null;
  providerName: string | null;
  amountMin: number;
  amountMax: number | null;
  funding: unknown;
  tags: string[] | null;
  source: string | null;
  assessment: EligibilityAssessment;
}

const groups = [
  { tag: "funding-start", title: "Start here", description: "Review these programs and their next application windows.", open: true },
  { tag: "funding-later", title: "Plan for later in the degree", description: "Track enrollment, final-year and school-nomination requirements.", open: false },
  { tag: "funding-alternative", title: "If you consider UT Arlington", description: "These awards require UTA admission or enrollment and online-cohort confirmation. They cannot fund ACU or GCU study.", open: false },
];

export function GraduateFundingList({ awards }: { awards: GraduateFundingEntry[] }) {
  if (!awards.length) return null;

  return (
    <section className="space-y-4 rounded-xl border border-border-light bg-surface p-5 sm:p-6" aria-labelledby="msw-funding-list">
      <div>
        <h2 id="msw-funding-list" className="text-xl font-semibold text-text-primary">Social-work funding list</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {awards.length} researched opportunities to explore for an MSW. This list stays available before enrollment and before you refresh matches.
          Awards are competitive; amounts are the latest published, and future-cycle terms may change.
        </p>
      </div>
      {groups.map((group) => {
        const entries = awards.filter((award) => award.tags?.includes(group.tag));
        if (!entries.length) return null;
        return (
          <details key={group.tag} open={group.open} className="rounded-lg border border-border-light">
            <summary className="cursor-pointer px-4 py-3 font-semibold text-text-primary">
              {group.title} <span className="ml-1 text-sm font-normal text-text-secondary">({entries.length})</span>
            </summary>
            <div className="space-y-4 px-4 pb-4">
              <p className="text-sm text-text-secondary">{group.description}</p>
              {entries.map((award) => {
                const terms = parseFunding(award.funding);
                const concern = award.assessment.status === "ineligible" ? award.assessment.reasons[0] : award.assessment.concerns[0];
                return (
                  <article key={award.id} className="space-y-2 border-t border-border-light pt-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="font-semibold text-text-primary">
                        <Link href={`/scholarships/${award.id}`} className="underline decoration-accent-teal/40 underline-offset-4 hover:text-accent-teal">{award.name}</Link>
                      </h3>
                      <p className="font-semibold text-primary-navy">{formatFunding(award.amountMin, award.amountMax, award.funding)}</p>
                    </div>
                    <p className="text-xs text-text-secondary">{award.providerName}</p>
                    <p className="text-sm leading-relaxed text-text-secondary">{award.description}</p>
                    {terms?.applicationCycle && <p className="text-sm text-text-secondary"><strong className="text-text-primary">Timing:</strong> {terms.applicationCycle}</p>}
                    <p className="text-sm text-text-secondary"><strong className="text-text-primary">Current profile:</strong> {eligibilityLabels[award.assessment.status]}. {concern}</p>
                    {terms?.serviceObligation && <p className="text-sm text-amber-800"><strong>Service commitment:</strong> {terms.serviceObligation}</p>}
                    {terms?.nextStep && <p className="text-sm text-text-secondary"><strong className="text-text-primary">Next step:</strong> {terms.nextStep}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-accent-teal">
                      <Link href={`/scholarships/${award.id}`} className="underline underline-offset-4">Review all requirements</Link>
                      {award.source && <a href={award.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Official source</a>}
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        );
      })}
    </section>
  );
}
