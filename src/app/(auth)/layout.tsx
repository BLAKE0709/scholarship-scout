export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#14312e]">
      <header className="border-b border-[#dce5e1]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-5">
          <a
            href="/"
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Scholarship <span className="text-[#1a9988]">Scout</span>
          </a>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-start gap-12 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
        <div className="hidden max-w-md lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a97f24]">
            Scholarship matching for families
          </p>
          <h1
            className="mt-3 text-4xl font-semibold leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Real scholarships start with a real profile.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#526461]">
            Set up your student once. Scout will rank verified awards, track the
            deadlines, and keep every application in view.
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-[#dce5e1] bg-white p-6 shadow-none sm:p-8 lg:justify-self-start">
          {children}
        </div>
      </main>
    </div>
  );
}
