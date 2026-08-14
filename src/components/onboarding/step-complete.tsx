"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Sparkles } from "lucide-react";

interface StepCompleteProps {
  vaultScore: number;
  matchCount: number;
}

export function StepComplete({ vaultScore, matchCount }: StepCompleteProps) {
  const router = useRouter();
  const [trialLoading, setTrialLoading] = useState(false);

  async function handleStartTrial() {
    setTrialLoading(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "pro", trial: true }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    }
    setTrialLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="relative space-y-8 text-center">
      <div className="space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#a97f24]/35 bg-[#a97f24]/[0.07]">
          <Sparkles className="h-6 w-6 text-[#a97f24]" />
        </div>
        <h2
          className="text-3xl font-semibold tracking-tight text-[#14312e]"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Your profile is ready.
        </h2>
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-[#526461]">
          {matchCount > 0
            ? `Scout found ${matchCount} scholarships to review. Start with the strongest fits, then add more detail whenever you want sharper matches.`
            : "Scout is matching you against its verified scholarship database now — your matches will be waiting on your dashboard."}
        </p>
      </div>

      <div className="mx-auto grid max-w-sm gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#dce5e1] bg-white p-4">
          <div className="flex items-center justify-center gap-2 text-[#526461]">
            <Shield className="h-4 w-4" />
            <span className="text-sm">Vault Health</span>
          </div>
          <p className="mt-2 font-mono text-4xl font-bold text-[#1a9988]">
            {vaultScore}
          </p>
          <p className="text-xs text-[#526461]">out of 100</p>
        </div>
        <div className="rounded-2xl border border-[#dce5e1] bg-white p-4">
          <div className="flex items-center justify-center gap-2 text-[#526461]">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">Matches to review</span>
          </div>
          <p className="mt-2 font-mono text-4xl font-bold text-[#a97f24]">
            {matchCount}
          </p>
          <p className="text-xs text-[#526461]">scholarships</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#dce5e1] bg-[#eaf2ef]/60 p-5 text-left">
        <p className="text-sm font-semibold text-[#14312e]">
          Try Pro free for 14 days
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#526461]">
          Review every match and use the essay coach. No card required.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 rounded-full border-[#1a9988] text-[#0e4f47] hover:bg-[#1a9988] hover:text-white"
          onClick={handleStartTrial}
          disabled={trialLoading}
        >
          {trialLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start the trial
        </Button>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full rounded-full bg-[#1a9988] text-white hover:bg-[#0e4f47]"
          size="lg"
          onClick={() => router.push("/scholarships")}
        >
          Review my matches
        </Button>
        <Button
          variant="ghost"
          className="w-full text-[#526461]"
          onClick={() => router.push("/dashboard")}
        >
          Continue with the free plan
        </Button>
      </div>
    </div>
  );
}
