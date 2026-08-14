"use client";

import { usePlan } from "@/hooks/use-plan";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import type { PlanFeatures } from "@/lib/billing/plans";
import { FEATURE_DISPLAY_NAMES } from "@/lib/billing/plans";

interface UpgradeGateProps {
  feature: keyof PlanFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: "inline" | "overlay";
}

export function UpgradeGate({
  feature,
  children,
  fallback,
  variant = "inline",
}: UpgradeGateProps) {
  const { checkFeature, isLoading } = usePlan();

  // While loading, render children to avoid flash of locked content
  if (isLoading) {
    return <>{children}</>;
  }

  const allowed = checkFeature(feature);

  if (allowed) {
    return <>{children}</>;
  }

  const featureLabel = FEATURE_DISPLAY_NAMES[feature] ?? feature;

  if (fallback) {
    return <>{fallback}</>;
  }

  if (variant === "overlay") {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl">
          <Card className="w-[320px] border border-[var(--border-light)] shadow-lg">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--highlight-gold)]/10">
                <Lock className="h-5 w-5 text-[var(--highlight-gold)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {featureLabel}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Upgrade to Pro to unlock {featureLabel.toLowerCase()} and take
                your scholarship search to the next level.
              </p>
              <Button
                asChild
                className="mt-1 bg-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/90 text-white"
              >
                <Link href="/pricing">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Upgrade to Pro
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <Card className="border border-[var(--border-light)] bg-[var(--surface)]">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--highlight-gold)]/10">
          <Lock className="h-5 w-5 text-[var(--highlight-gold)]" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {featureLabel}
        </p>
        <p className="text-xs text-[var(--text-secondary)] max-w-xs">
          This feature is available on the Pro plan. Upgrade to unlock{" "}
          {featureLabel.toLowerCase()} and get the most out of Scholarship
          Scout.
        </p>
        <Button
          asChild
          className="mt-1 bg-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/90 text-white"
        >
          <Link href="/pricing">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Upgrade to Pro
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
