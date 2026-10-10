"use client";

import { useState } from "react";
import Link from "next/link";
import { ScholarshipCard, type ScholarshipCardProps } from "./scholarship-card";
import { parseFunding, type Funding } from "@/lib/scholarships/funding";

type Filter = "all" | "nontraditional" | Funding["kind"];
const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All funding" },
  { value: "nontraditional", label: "Nontraditional routes" },
  { value: "tuition_discount", label: "Tuition discounts" },
  { value: "employer_assistance", label: "Employer support" },
  { value: "grant", label: "Grants" },
  { value: "paid_placement", label: "Paid placements" },
  { value: "scholarship", label: "Scholarships" },
  { value: "loan_repayment", label: "Loan repayment" },
];

function matchesFilter(match: ScholarshipCardProps, filter: Filter) {
  const kind = parseFunding(match.funding)?.kind ?? "scholarship";
  if (filter === "all") return true;
  if (filter === "nontraditional") return ["tuition_discount", "employer_assistance", "grant", "paid_placement"].includes(kind);
  return kind === filter;
}

export function FundingExplorer({ matches, graduate }: { matches: ScholarshipCardProps[]; graduate: boolean }) {
  const [filter, setFilter] = useState<Filter>(graduate ? "nontraditional" : "all");
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const results = matches.filter((match) => matchesFilter(match, filter) && [match.name, match.providerName, ...(match.tags ?? [])].join(" ").toLowerCase().includes(search));

  return (
    <div className="space-y-6">
      {graduate && (
        <section className="rounded-xl border border-border-light bg-surface p-5 sm:p-6" aria-labelledby="graduate-funding-route">
          <h2 id="graduate-funding-route" className="text-xl font-semibold text-text-primary">Your grad-school funding route</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Start with the cost of your program, then explore support tied to your work, experience, and field placement.
          </p>
          <ol className="mt-5 grid gap-5 text-sm md:grid-cols-3">
            <li><h3 className="font-semibold text-text-primary">1. Lower tuition first</h3><p className="mt-1 leading-relaxed text-text-secondary">Check alumni discounts and employer partnerships. Get a written net-cost estimate and confirm which awards can combine.</p></li>
            <li><h3 className="font-semibold text-text-primary">2. Fund the practical training</h3><p className="mt-1 leading-relaxed text-text-secondary">Ask your program about paid field placements and service stipends. Confirm location, school eligibility, and any work commitment.</p></li>
            <li><h3 className="font-semibold text-text-primary">3. Target your background</h3><p className="mt-1 leading-relaxed text-text-secondary">Review returning-student grants and professional awards. Track chapter sponsorship, membership, and next-cycle dates early.</p></li>
          </ol>
          <Link href="/vault" className="mt-5 inline-block text-sm font-medium text-accent-teal underline underline-offset-4">Update your education and work background</Link>
        </section>
      )}

      <div className="space-y-3">
        <label htmlFor="funding-search" className="block text-sm font-medium text-text-primary">Search your funding matches</label>
        <input id="funding-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="School, provider, or field of study" className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm outline-offset-2 focus:outline-accent-teal sm:max-w-md" />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Funding category">
          {filters.filter((option) => option.value === "all" || option.value === "nontraditional" || matches.some((match) => matchesFilter(match, option.value))).map((option) => (
            <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)} className={"rounded-full border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal " + (filter === option.value ? "border-primary-navy bg-primary-navy text-white" : "border-border-light bg-surface text-text-secondary hover:border-accent-teal")}>
              {option.label} <span className="ml-1 tabular-nums">{matches.filter((match) => matchesFilter(match, option.value)).length}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-text-secondary" role="status">{results.length} {results.length === 1 ? "opportunity" : "opportunities"} shown. Each has its own eligibility and timing.</p>
      {results.length ? (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((match) => <ScholarshipCard key={match.id} {...match} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-light p-8 text-center">
          <p className="text-sm text-text-secondary">No matches in this view. Try another category or update your profile and refresh matches.</p>
          <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="mt-3 text-sm font-medium text-accent-teal underline">Show all funding</button>
        </div>
      )}
    </div>
  );
}
