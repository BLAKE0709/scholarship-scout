import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#14312e]">
      <header className="border-b border-[#dce5e1] bg-[#fbfaf6]/90">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5">
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Scholarship <span className="text-[#1a9988]">Scout</span>
          </span>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#0e4f47] underline decoration-[#a97f24] decoration-2 underline-offset-4"
          >
            Save and finish later
          </Link>
        </div>
      </header>
      <main className="flex justify-center px-5 py-10">{children}</main>
    </div>
  );
}
