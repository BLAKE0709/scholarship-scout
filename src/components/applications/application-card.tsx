"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, FileText } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";

interface ApplicationCardProps {
  application: {
    id: string;
    scholarshipName: string;
    amountMin: number;
    amountMax: number | null;
    deadline: string | null;
    essayCount: number;
    status: string;
  };
}

function formatAmount(min: number, max: number | null): string {
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;
  if (max && max !== min) {
    return `${fmt(min)} - ${fmt(max)}`;
  }
  return fmt(min);
}

function getDeadlineUrgency(deadline: string | null): {
  color: string;
  label: string;
} {
  if (!deadline) return { color: "bg-gray-300", label: "No deadline" };
  const days = differenceInDays(parseISO(deadline), new Date());
  if (days < 0) return { color: "bg-gray-400", label: "Past due" };
  if (days <= 3) return { color: "bg-[var(--error)]", label: `${days}d left` };
  if (days <= 14)
    return { color: "bg-[var(--warning)]", label: `${days}d left` };
  return {
    color: "bg-accent-teal",
    label: format(parseISO(deadline), "MMM d"),
  };
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const urgency = getDeadlineUrgency(application.deadline);

  return (
    <div
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", application.id);
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      onClick={() => router.push(`/applications/${application.id}`)}
      className={`cursor-pointer rounded-lg border border-border-light bg-surface p-3 shadow-sm transition-all hover:shadow-md ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      {/* Scholarship name (truncated) */}
      <p className="truncate text-sm font-medium text-text-primary">
        {application.scholarshipName}
      </p>

      {/* Amount and deadline row */}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-highlight-gold">
          {formatAmount(application.amountMin, application.amountMax)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${urgency.color}`} />
          <span className="text-xs text-text-secondary">{urgency.label}</span>
        </div>
      </div>

      {/* Essays / deadline info */}
      <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          <span>
            {application.essayCount} essay
            {application.essayCount !== 1 ? "s" : ""}
          </span>
        </div>
        {application.deadline && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(parseISO(application.deadline), "MMM d, yyyy")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
