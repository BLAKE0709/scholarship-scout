"use client";

import { Target, PenTool, FileText, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "match" | "essay" | "application" | "score";
  description: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

const typeConfig: Record<
  ActivityItem["type"],
  { icon: LucideIcon; color: string; bg: string }
> = {
  match: {
    icon: Target,
    color: "text-accent-teal",
    bg: "bg-accent-teal/10",
  },
  essay: {
    icon: PenTool,
    color: "text-highlight-gold",
    bg: "bg-highlight-gold/10",
  },
  application: {
    icon: FileText,
    color: "text-primary-navy",
    bg: "bg-primary-navy/10",
  },
  score: {
    icon: Shield,
    color: "text-accent-teal",
    bg: "bg-accent-teal/10",
  },
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Target className="h-10 w-10 text-text-secondary/30 mb-2" />
        <p className="text-sm text-text-secondary">No recent activity</p>
        <p className="text-xs text-text-secondary/70 mt-1">
          Start matching with scholarships to see activity here
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border-light" />

      <div className="space-y-4">
        {activities.map((activity) => {
          const config = typeConfig[activity.type];
          const Icon = config.icon;
          const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
            addSuffix: true,
          });

          return (
            <div key={activity.id} className="relative flex gap-3">
              {/* Dot with icon */}
              <div
                className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${config.bg}`}
              >
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm text-text-primary leading-snug">
                  {activity.description}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">{timeAgo}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
