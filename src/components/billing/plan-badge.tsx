"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PlanSlug = "free" | "pro" | "family" | "district";

interface PlanBadgeProps {
  plan: PlanSlug;
  isTrial?: boolean;
  className?: string;
}

const planConfig: Record<PlanSlug, { label: string; className: string }> = {
  free: {
    label: "FREE",
    className:
      "bg-text-secondary/10 text-text-secondary border-text-secondary/20",
  },
  pro: {
    label: "PRO",
    className: "bg-accent-teal/10 text-accent-teal border-accent-teal/20",
  },
  family: {
    label: "FAMILY",
    className: "bg-primary-navy/10 text-primary-navy border-primary-navy/20",
  },
  district: {
    label: "DISTRICT",
    className:
      "bg-highlight-gold/10 text-highlight-gold border-highlight-gold/20",
  },
};

export function PlanBadge({ plan, isTrial, className }: PlanBadgeProps) {
  if (isTrial) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-highlight-gold text-highlight-gold bg-transparent text-[10px] uppercase tracking-wider",
          className,
        )}
      >
        Trial
      </Badge>
    );
  }

  const config = planConfig[plan] ?? planConfig.free;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] uppercase tracking-wider",
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
