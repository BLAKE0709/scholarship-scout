"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import { usePlan } from "@/hooks/use-plan";

const SESSION_STORAGE_KEY = "trial-banner-dismissed";

interface TrialStatusResponse {
  isTrial: boolean;
  daysRemaining: number;
  expiresAt: string | null;
  planSlug: string | null;
}

export function TrialBanner() {
  const { isTrial, isLoading } = usePlan();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [trialLoaded, setTrialLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored === "true") {
      setDismissed(true);
    }
  }, []);

  const fetchTrialStatus = useCallback(async () => {
    if (!isTrial) return;

    try {
      const response = await fetch("/api/billing/trial-status");
      if (!response.ok) return;

      const data: TrialStatusResponse = await response.json();
      setDaysRemaining(data.daysRemaining);
    } catch {
      // Silent fail — banner still renders with 0 days if fetch fails
    } finally {
      setTrialLoaded(true);
    }
  }, [isTrial]);

  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  if (!mounted || isLoading || !isTrial || dismissed || !trialLoaded) {
    return null;
  }

  const isUrgent = daysRemaining <= 3;
  const isLastDay = daysRemaining <= 1;

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
  }

  const message = isLastDay
    ? "Last day of your trial! Subscribe to keep access."
    : `You have ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left in your Pro trial.`;

  return (
    <div
      className={`relative flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium ${
        isUrgent
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          : "bg-accent-teal/10 text-accent-teal"
      }`}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>{message}</span>
      <Link
        href="/pricing"
        className={`ml-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
          isUrgent
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-accent-teal text-white hover:bg-accent-teal/90"
        }`}
      >
        Subscribe Now
      </Link>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss trial banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
