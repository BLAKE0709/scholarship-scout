"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

type NudgeType =
  | "match_limit"
  | "essay_limit"
  | "fidelity_tease"
  | "vault_export";

interface UpgradeNudgeProps {
  type: NudgeType;
}

interface NudgeConfig {
  title: string;
  description: string;
  showBlurredGauge: boolean;
}

const NUDGE_CONFIGS: Record<NudgeType, NudgeConfig> = {
  match_limit: {
    title: "Match limit reached",
    description:
      "You have used all 5 free matches this month. Upgrade for unlimited scholarship matches tailored to your profile.",
    showBlurredGauge: false,
  },
  essay_limit: {
    title: "Essay limit reached",
    description:
      "Free plan includes 2 essays per month. Go Pro for unlimited essays with AI-powered feedback and revision tracking.",
    showBlurredGauge: false,
  },
  fidelity_tease: {
    title: "Your Fidelity Score is ready",
    description:
      "We have analyzed your writing. Upgrade to see your personal Fidelity Score and detailed authenticity breakdown.",
    showBlurredGauge: true,
  },
  vault_export: {
    title: "Vault export is a Pro feature",
    description:
      "Export your complete scholarship vault — applications, essays, and documents — as a single organized package.",
    showBlurredGauge: false,
  },
};

export function UpgradeNudge({ type }: UpgradeNudgeProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    fetch("/api/analytics/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "upgrade_nudge_shown",
        metadata: { nudgeType: type },
      }),
    }).catch(() => {
      // Fire and forget — analytics should never block UI
    });
  }, [type]);

  const config = NUDGE_CONFIGS[type];

  function handleUpgradeClick() {
    fetch("/api/analytics/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "upgrade_nudge_clicked",
        metadata: { nudgeType: type },
      }),
    }).catch(() => {
      // Fire and forget
    });
  }

  return (
    <div className="rounded-lg border border-accent-teal/20 bg-accent-teal/5 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-teal/10">
          <Lock className="h-4 w-4 text-accent-teal" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-text-primary">
            {config.title}
          </h4>
          <p className="mt-1 text-sm text-text-secondary">
            {config.description}
          </p>

          {config.showBlurredGauge && (
            <div className="relative mt-3 h-16 w-full overflow-hidden rounded-md">
              {/* Blurred gauge placeholder */}
              <div className="absolute inset-0 flex items-center justify-center blur-md">
                <div className="flex items-end gap-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="w-4 rounded-sm bg-accent-teal"
                      style={{
                        height: `${12 + i * 4}px`,
                        opacity: 0.3 + i * 0.07,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-surface/30">
                <Lock className="h-5 w-5 text-text-secondary/50" />
              </div>
            </div>
          )}

          <Link
            href="/pricing"
            onClick={handleUpgradeClick}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent-teal px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-teal/90"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
