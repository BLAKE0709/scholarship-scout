"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number | null;
  resetDate: Date | string;
}

function getProgressColor(percentage: number): string {
  if (percentage >= 90) return "bg-[var(--error)]";
  if (percentage >= 60) return "bg-[var(--warning)]";
  return "bg-[var(--accent-teal)]";
}

function formatResetDate(resetDate: Date | string): string {
  const date = typeof resetDate === "string" ? new Date(resetDate) : resetDate;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function UsageMeter({ label, used, limit, resetDate }: UsageMeterProps) {
  // Unlimited
  if (limit === null) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--text-primary)]">
            {label}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            Unlimited
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--accent-teal)]/10">
          <div className="h-full rounded-full bg-[var(--accent-teal)] w-[15%] transition-all duration-500" />
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          {used} used this period
        </p>
      </div>
    );
  }

  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const atLimit = used >= limit;
  const barColor = getProgressColor(percentage);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-xs text-[var(--text-secondary)]">
          {used} of {limit} used
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {atLimit ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--error)] font-medium">
            You have reached your free limit. Upgrade for unlimited access.
          </p>
          <Button
            asChild
            variant="link"
            size="xs"
            className="text-[var(--accent-teal)] px-0 h-auto"
          >
            <Link href="/pricing">Upgrade</Link>
          </Button>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-secondary)]">
          Resets {formatResetDate(resetDate)}
        </p>
      )}
    </div>
  );
}
