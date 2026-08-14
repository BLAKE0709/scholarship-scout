import { BadgeCheck, CalendarClock } from "lucide-react";

// The signature element: a dealt hand of real match cards. Every scholarship
// shown here is a real record from the seeded database — name, amount, and
// deadline are true, which is the entire point of the product.
const CARDS = [
  {
    name: "Coca-Cola Scholars Program",
    provider: "The Coca-Cola Scholars Foundation",
    amount: "$20,000",
    deadline: "Sep 30, 2026",
    match: "Strong fit",
    rotate: "-5deg",
    delay: "0.05s",
  },
  {
    name: "Texas Mutual Scholarship",
    provider: "Texas Mutual Insurance",
    amount: "$6,600",
    deadline: "Oct 31, 2026",
    match: "Texas resident",
    rotate: "1.5deg",
    delay: "0.22s",
  },
  {
    name: "Texas Garden Clubs Scholarship",
    provider: "Texas Garden Clubs, Inc.",
    amount: "$3,000–4,000",
    deadline: "Oct 1, 2026",
    match: "Local advantage",
    rotate: "6deg",
    delay: "0.39s",
  },
];

export function MatchCardStack() {
  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col items-stretch gap-4 sm:gap-5">
      {CARDS.map((c) => (
        <article
          key={c.name}
          className="scout-deal rounded-2xl border border-[var(--scout-line)] bg-white p-5 shadow-[0_10px_30px_-12px_rgba(20,49,46,0.25)]"
          style={
            {
              "--deal-rotate": c.rotate,
              "--deal-delay": c.delay,
            } as React.CSSProperties
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold leading-snug">
                {c.name}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--scout-ink)]/60">
                {c.provider}
              </p>
            </div>
            <span
              className="shrink-0 font-mono text-base font-semibold text-[var(--scout-brass)]"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {c.amount}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--scout-brass)]/40 bg-[var(--scout-brass)]/[0.07] px-2.5 py-1 text-[11px] font-medium text-[var(--scout-brass)]">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              Source verified
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[var(--scout-mist)] px-2.5 py-1 text-[11px] font-medium text-[var(--scout-deep)]"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              {c.deadline}
            </span>
            <span className="ml-auto text-[11px] font-medium uppercase tracking-wide text-[var(--scout-pine)]">
              {c.match}
            </span>
          </div>
        </article>
      ))}
      <p className="mt-1 text-center text-xs text-[var(--scout-ink)]/50">
        Three of the 291 verified scholarships in Scout today — amounts and
        deadlines as published by each provider.
      </p>
    </div>
  );
}
