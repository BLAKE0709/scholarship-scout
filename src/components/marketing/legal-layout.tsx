// Shared prose shell for legal pages: title, last-updated stamp, and a
// table of contents generated from the numbered sections passed in.
export type LegalSection = {
  id: string;
  heading: string;
  body: React.ReactNode;
};

export function LegalLayout({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14">
      <h1
        className="text-3xl font-semibold tracking-tight sm:text-4xl"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {title}
      </h1>
      <p
        className="mt-2 text-xs uppercase tracking-[0.15em] text-[var(--scout-ink)]/50"
        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
      >
        Last updated {lastUpdated}
      </p>
      <div className="mt-6 text-[15px] leading-relaxed text-[var(--scout-ink)]/80">
        {intro}
      </div>

      <nav
        aria-label="Table of contents"
        className="mt-8 rounded-xl border border-[var(--scout-line)] bg-[var(--scout-mist)]/50 p-5"
      >
        <p className="text-sm font-semibold">On this page</p>
        <ol className="mt-2 space-y-1 text-sm">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-[var(--scout-deep)] hover:text-[var(--scout-ink)]"
              >
                {i + 1}. {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[var(--scout-ink)]/80">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
