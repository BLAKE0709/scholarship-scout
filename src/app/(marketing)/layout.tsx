import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import Link from "next/link";
import "./marketing.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title:
    "Scholarship Scout — real scholarships, real deadlines, your kid's real voice",
  description:
    "Match your student to source-verified scholarships, track every deadline to the day, and coach essays without ever writing a word for them. Family-built in Texas.",
};

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`scout-marketing ${fraunces.variable} min-h-screen flex flex-col`}
    >
      <header className="sticky top-0 z-40 border-b border-[var(--scout-line)] bg-[var(--scout-paper)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link
            href="/"
            className="text-lg tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            <span className="font-semibold">Scholarship</span>{" "}
            <span className="font-semibold text-[var(--scout-pine)]">
              Scout
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-6">
            <a
              href="/#how"
              className="hidden text-sm text-[var(--scout-ink)]/75 hover:text-[var(--scout-ink)] sm:block"
            >
              How it works
            </a>
            <a
              href="/#pricing"
              className="hidden text-sm text-[var(--scout-ink)]/75 hover:text-[var(--scout-ink)] sm:block"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="text-sm text-[var(--scout-ink)]/75 hover:text-[var(--scout-ink)]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[var(--scout-pine)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--scout-deep)]"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--scout-line)] bg-[var(--scout-mist)]/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[var(--scout-ink)]/70">
            <span
              style={{ fontFamily: "var(--font-fraunces)" }}
              className="font-semibold"
            >
              Scholarship Scout
            </span>{" "}
            · Family-built in Colleyville, Texas
          </div>
          <nav className="flex gap-6 text-sm text-[var(--scout-ink)]/70">
            <Link href="/privacy" className="hover:text-[var(--scout-ink)]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--scout-ink)]">
              Terms
            </Link>
            <a
              href="mailto:support@scholarshipscout.app"
              className="hover:text-[var(--scout-ink)]"
            >
              Contact
            </a>
          </nav>
          <div className="text-xs text-[var(--scout-ink)]/50">
            © {new Date().getFullYear()} Scholarship Scout
          </div>
        </div>
      </footer>
    </div>
  );
}
