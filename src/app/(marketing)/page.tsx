import Link from "next/link";
import {
  BadgeCheck,
  BellRing,
  FolderLock,
  KanbanSquare,
  PenLine,
  Target,
  UserRound,
  Check,
} from "lucide-react";
import { MatchCardStack } from "@/components/marketing/match-card-stack";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--scout-brass)]"
      style={{ fontFamily: "var(--font-jetbrains-mono)" }}
    >
      {children}
    </p>
  );
}

function Display({
  as: Tag = "h2",
  children,
  className = "",
}: {
  as?: "h1" | "h2" | "h3";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tag
      className={`tracking-tight text-[var(--scout-ink)] ${className}`}
      style={{ fontFamily: "var(--font-fraunces)" }}
    >
      {children}
    </Tag>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="max-w-xl">
          <Eyebrow>Scholarship matching for families</Eyebrow>
          <Display
            as="h1"
            className="text-4xl font-semibold leading-[1.08] sm:text-5xl"
          >
            Real scholarships. Real deadlines.{" "}
            <span className="text-[var(--scout-pine)]">
              Your kid&apos;s real voice.
            </span>
          </Display>
          <p className="mt-5 text-lg leading-relaxed text-[var(--scout-ink)]/75">
            Scholarship Scout matches your student to source-verified awards,
            tracks every deadline to the day, and coaches essays without ever
            writing a word for them.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-[var(--scout-pine)] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[var(--scout-deep)]"
            >
              Start free
            </Link>
            <a
              href="#how"
              className="text-base font-medium text-[var(--scout-deep)] underline decoration-[var(--scout-brass)] decoration-2 underline-offset-4 hover:text-[var(--scout-ink)]"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-[var(--scout-ink)]/55">
            Free plan forever · 14-day Pro trial · no card required
          </p>
        </div>
        <MatchCardStack />
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-[var(--scout-line)] bg-[var(--scout-mist)]/70">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
          {[
            {
              title: "Verified, not scraped",
              body: "Every scholarship carries a source link and a last-verified date. No dead deadlines, no zombie listings.",
            },
            {
              title: "Deadlines to the day",
              body: "One pipeline for every application, with alerts that fire while there is still time to act.",
            },
            {
              title: "Coached, never ghostwritten",
              body: "The essay coach improves your student's draft and scores how much of their own voice survives.",
            },
          ].map((t) => (
            <div key={t.title}>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--scout-ink)]/70">
                {t.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        id="how"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20"
      >
        <Eyebrow>How it works</Eyebrow>
        <Display className="text-3xl font-semibold sm:text-4xl">
          Ten minutes of setup. A season of momentum.
        </Display>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: "Build the profile",
              body: "Grades, interests, activities, state — entered once, reused everywhere. Students own it; parents can be invited alongside.",
            },
            {
              n: "2",
              title: "Get matched",
              body: "The engine scores fit and win probability against verified awards — national money and the local funds most families never find.",
            },
            {
              n: "3",
              title: "Apply with confidence",
              body: "Track every application on one board, keep documents in the vault, and draft essays with a coach that protects your student's voice.",
            },
          ].map((s) => (
            <div key={s.n} className="relative">
              <div
                className="text-5xl font-semibold text-[var(--scout-pine)]/25"
                style={{ fontFamily: "var(--font-fraunces)" }}
                aria-hidden
              >
                {s.n}
              </div>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--scout-ink)]/70">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────────────── */}
      <section className="bg-[var(--scout-ink)] text-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <Eyebrow>What&apos;s inside</Eyebrow>
          <Display className="text-3xl font-semibold text-white sm:text-4xl">
            Everything between “we should look into scholarships” and “we won
            one.”
          </Display>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Verified matching",
                body: "Fit scores and win probability against a database where every award has a source and a freshness stamp.",
              },
              {
                icon: KanbanSquare,
                title: "Application pipeline",
                body: "A drag-and-drop board from “researching” to “submitted,” so nothing slips between the cracks.",
              },
              {
                icon: PenLine,
                title: "Essay coach with fidelity score",
                body: "AI feedback that strengthens the draft while measuring that the writing stays your student's own.",
              },
              {
                icon: FolderLock,
                title: "Document vault",
                body: "Transcripts, recommendation letters, and achievements in one place — exportable anytime.",
              },
              {
                icon: UserRound,
                title: "Parent view",
                body: "Progress, deadlines, and momentum at a glance — with hard privacy walls around the writing itself.",
              },
              {
                icon: BellRing,
                title: "Deadline alerts",
                body: "Notifications tuned to lead time, not panic — weekly digests and day-of nudges.",
              },
            ].map((f) => (
              <div key={f.title}>
                <f.icon
                  className="h-6 w-6 text-[var(--scout-pine)]"
                  aria-hidden
                />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/65">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For parents ──────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>For parents</Eyebrow>
            <Display className="text-3xl font-semibold sm:text-4xl">
              You see progress. They keep their voice.
            </Display>
            <p className="mt-4 leading-relaxed text-[var(--scout-ink)]/75">
              Scout was built by parents paying for college too. The parent view
              shows you what matters without turning you into an editor — and
              the boundaries are enforced by the product, not by promises.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              "See matches, deadlines, and application momentum for every student in the family.",
              "Never see essay drafts, revision history, or AI conversations — that stays the student's.",
              "Get the same deadline alerts, so the kitchen-table conversation starts from the same facts.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-1 rounded-full bg-[var(--scout-pine)]/10 p-1">
                  <Check
                    className="h-4 w-4 text-[var(--scout-pine)]"
                    aria-hidden
                  />
                </span>
                <span className="text-[15px] leading-relaxed text-[var(--scout-ink)]/80">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="scroll-mt-24 border-t border-[var(--scout-line)] bg-[var(--scout-mist)]/50"
      >
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <Eyebrow>Pricing</Eyebrow>
          <Display className="text-3xl font-semibold sm:text-4xl">
            Less than one application fee a month.
          </Display>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-[var(--scout-line)] bg-white p-7">
              <h3 className="font-semibold">Free</h3>
              <p className="mt-1 text-sm text-[var(--scout-ink)]/60">
                Start matching today
              </p>
              <div
                className="mt-4 text-4xl font-semibold"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                $0
              </div>
              <ul className="mt-6 space-y-2.5 text-sm text-[var(--scout-ink)]/75">
                {[
                  "5 new matches every month",
                  "2 essay drafts per month",
                  "Application tracking board",
                  "3 document uploads",
                ].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--scout-pine)]"
                      aria-hidden
                    />
                    {x}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 rounded-full border border-[var(--scout-pine)] px-5 py-2.5 text-center text-sm font-medium text-[var(--scout-deep)] transition-colors hover:bg-[var(--scout-pine)] hover:text-white"
              >
                Start free
              </Link>
            </div>
            {/* Pro */}
            <div className="relative flex flex-col rounded-2xl border-2 border-[var(--scout-pine)] bg-white p-7 shadow-lg">
              <span className="absolute -top-3 left-6 rounded-full bg-[var(--scout-pine)] px-3 py-0.5 text-xs font-medium text-white">
                14-day free trial
              </span>
              <h3 className="font-semibold">Pro</h3>
              <p className="mt-1 text-sm text-[var(--scout-ink)]/60">
                For one determined student
              </p>
              <div
                className="mt-4 text-4xl font-semibold"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                $9.99
                <span className="text-base font-normal text-[var(--scout-ink)]/55">
                  /mo
                </span>
              </div>
              <p className="text-xs text-[var(--scout-ink)]/50">
                or $99.99/year
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-[var(--scout-ink)]/75">
                {[
                  "Unlimited matches and saved awards",
                  "Unlimited essays with fidelity + authenticity scores",
                  "Unlimited document vault with export",
                  "Full win-probability breakdowns",
                ].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--scout-pine)]"
                      aria-hidden
                    />
                    {x}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 rounded-full bg-[var(--scout-pine)] px-5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[var(--scout-deep)]"
              >
                Start 14-day trial
              </Link>
            </div>
            {/* Family */}
            <div className="flex flex-col rounded-2xl border border-[var(--scout-line)] bg-white p-7">
              <h3 className="font-semibold">Family</h3>
              <p className="mt-1 text-sm text-[var(--scout-ink)]/60">
                Every student in the house
              </p>
              <div
                className="mt-4 text-4xl font-semibold"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                $14.99
                <span className="text-base font-normal text-[var(--scout-ink)]/55">
                  /mo
                </span>
              </div>
              <p className="text-xs text-[var(--scout-ink)]/50">
                or $149.99/year
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-[var(--scout-ink)]/75">
                {[
                  "Everything in Pro",
                  "Parent dashboard with linked students",
                  "Family-wide deadline view",
                  "Priority support",
                ].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--scout-pine)]"
                      aria-hidden
                    />
                    {x}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 rounded-full border border-[var(--scout-pine)] px-5 py-2.5 text-center text-sm font-medium text-[var(--scout-deep)] transition-colors hover:bg-[var(--scout-pine)] hover:text-white"
              >
                Start 14-day trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-5 py-20">
        <Eyebrow>Questions, answered straight</Eyebrow>
        <Display className="text-3xl font-semibold sm:text-4xl">
          Fair questions.
        </Display>
        <div className="scout-faq mt-8">
          {[
            {
              q: "Is it actually free?",
              a: "Yes. The free plan works forever — five new matches and two coached essay drafts a month, plus the application board. Pro and Family add unlimited everything, and both start with a 14-day trial that doesn't ask for a card.",
            },
            {
              q: "How are scholarships verified?",
              a: "Every award in Scout links to the provider's own page and carries the date we last confirmed it. When a cycle's dates aren't published yet, we say \"upcoming\" instead of guessing — a wrong deadline is worse than no deadline.",
            },
            {
              q: "Does the AI write my student's essay?",
              a: "No, and that's a design decision, not a disclaimer. The coach asks questions, suggests structure, and flags weak spots — then scores fidelity: how much of the final draft is still your student's own words and ideas. Submitting their own work is the whole point.",
            },
            {
              q: "Can parents read the essays?",
              a: "No. Parents see progress, deadlines, and wins — never drafts, revision history, or AI conversations. The boundary is enforced in the product itself.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes, in two clicks from billing settings. You keep access through the end of the period you paid for, and we don't charge again.",
            },
            {
              q: "Who builds this?",
              a: "A family in Colleyville, Texas with two students of their own — one in high school, one in college. We built the tool we wanted at our own kitchen table.",
            },
          ].map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <div className="text-sm leading-relaxed text-[var(--scout-ink)]/70">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-[var(--scout-deep)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Display className="text-2xl font-semibold text-white sm:text-3xl">
              The deadlines are already moving.
            </Display>
            <p className="mt-2 text-white/70">
              Set up a profile tonight; wake up to matches worth applying for.
            </p>
          </div>
          <Link
            href="/signup"
            className="shrink-0 rounded-full bg-white px-6 py-3 text-base font-medium text-[var(--scout-deep)] transition-colors hover:bg-[var(--scout-mist)]"
          >
            Start free
          </Link>
        </div>
      </section>

      {/* Verification note */}
      <div className="border-t border-[var(--scout-line)] bg-[var(--scout-paper)]">
        <p className="mx-auto flex w-full max-w-6xl items-center gap-2 px-5 py-4 text-xs text-[var(--scout-ink)]/50">
          <BadgeCheck
            className="h-4 w-4 text-[var(--scout-brass)]"
            aria-hidden
          />
          Scholarship amounts and deadlines are set by their providers and can
          change; Scout links to the source for every award so you can always
          check the original.
        </p>
      </div>
    </>
  );
}
