"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";

interface VaultHealthData {
  percentage: number;
  hasBasicInfo: boolean;
  hasAcademicScores: boolean;
  hasInterests: boolean;
  hasEssay: boolean;
  hasAchievement: boolean;
  hasDocument: boolean;
}

interface VaultHealthProps {
  health: VaultHealthData;
}

const checklistItems: {
  key: keyof Omit<VaultHealthData, "percentage">;
  label: string;
}[] = [
  { key: "hasBasicInfo", label: "Basic Information" },
  { key: "hasAcademicScores", label: "Academic Scores" },
  { key: "hasInterests", label: "Interests & Activities" },
  { key: "hasEssay", label: "At Least 1 Essay" },
  { key: "hasAchievement", label: "At Least 1 Achievement" },
  { key: "hasDocument", label: "At Least 1 Document" },
];

export function VaultHealth({ health }: VaultHealthProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    // Delay slightly so CSS transition triggers on mount
    const timer = setTimeout(() => {
      setAnimatedPercentage(health.percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [health.percentage]);

  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPercentage / 100) * circumference;

  const ringColor =
    health.percentage >= 80
      ? "var(--accent-teal)"
      : health.percentage >= 50
        ? "var(--highlight-gold)"
        : "var(--warning)";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular Progress Ring */}
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 0.8s ease-out, stroke 0.3s ease",
            }}
          />
        </svg>
        <span
          className="absolute font-mono text-2xl font-bold"
          style={{ color: ringColor }}
        >
          {animatedPercentage}%
        </span>
      </div>

      {/* Checklist */}
      <div className="w-full space-y-2">
        {checklistItems.map((item) => {
          const completed = health[item.key];
          return (
            <div key={item.key} className="flex items-center gap-2.5 text-sm">
              {completed ? (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-teal/10">
                  <Check className="h-3 w-3 text-accent-teal" />
                </div>
              ) : (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-border-light">
                  <X className="h-3 w-3 text-text-secondary" />
                </div>
              )}
              <span
                className={
                  completed
                    ? "text-accent-teal font-medium"
                    : "text-text-secondary"
                }
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Improvement link */}
      {health.percentage < 100 && (
        <Link
          href="/settings"
          className="mt-1 text-xs font-medium text-accent-teal hover:underline transition-colors duration-200"
        >
          Complete your profile to improve matches
        </Link>
      )}
    </div>
  );
}
