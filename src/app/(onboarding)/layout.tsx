import { Logo } from "@/components/shared/logo";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-page">
      <div className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Link
          href="/dashboard"
          className="text-sm text-accent-teal hover:underline"
        >
          Save &amp; Exit
        </Link>
      </div>
      <div className="flex justify-center px-4 pb-12">{children}</div>
    </div>
  );
}
