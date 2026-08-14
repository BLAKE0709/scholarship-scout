"use client";

import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DeadlineItem {
  scholarshipId: string;
  scholarshipName: string;
  deadline: string;
  daysRemaining: number;
}

interface DeadlineListProps {
  deadlines: DeadlineItem[];
}

function getDeadlineColor(daysRemaining: number): {
  bg: string;
  text: string;
  border: string;
  pulse: boolean;
} {
  if (daysRemaining < 7) {
    return {
      bg: "bg-error/10",
      text: "text-error",
      border: "border-error/20",
      pulse: true,
    };
  }
  if (daysRemaining < 30) {
    return {
      bg: "bg-warning/10",
      text: "text-warning",
      border: "border-warning/20",
      pulse: false,
    };
  }
  return {
    bg: "bg-accent-teal/10",
    text: "text-accent-teal",
    border: "border-accent-teal/20",
    pulse: false,
  };
}

function formatDeadlineDate(deadline: string): string {
  const d = new Date(deadline);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DeadlineList({ deadlines }: DeadlineListProps) {
  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-10 w-10 text-text-secondary/30 mb-2" />
        <p className="text-sm text-text-secondary">No upcoming deadlines</p>
        <p className="text-xs text-text-secondary/70 mt-1">
          Match with scholarships to track deadlines
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {deadlines.map((item) => {
        const colors = getDeadlineColor(item.daysRemaining);
        return (
          <Link
            key={item.scholarshipId}
            href={`/scholarships/${item.scholarshipId}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border-light bg-surface p-3 transition-all duration-200 hover:border-accent-teal/30 hover:shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {item.scholarshipName}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="h-3 w-3" />
                {formatDeadlineDate(item.deadline)}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 ${colors.bg} ${colors.text} ${colors.border} ${
                colors.pulse ? "animate-pulse" : ""
              }`}
            >
              {item.daysRemaining === 0
                ? "Today"
                : item.daysRemaining === 1
                  ? "1 day"
                  : `${item.daysRemaining} days`}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
