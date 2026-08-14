"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  color: string;
}

function useCountUp(target: number, duration: number = 800): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return current;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
}: StatCardProps) {
  // Parse numeric value for count-up; fall back to static display for non-numeric
  const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ""));
  const isNumeric = !isNaN(numericValue) && isFinite(numericValue);
  const prefix = isNumeric ? value.replace(/[0-9.,]+.*$/, "") : "";
  const suffix = isNumeric ? value.replace(/^[^0-9]*[0-9.,]+/, "") : "";
  const animatedValue = useCountUp(isNumeric ? numericValue : 0);

  const displayValue = isNumeric
    ? `${prefix}${animatedValue.toLocaleString()}${suffix}`
    : value;

  return (
    <Card className="relative overflow-hidden rounded-xl border border-border-light bg-surface shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        {/* Background icon */}
        <Icon
          className="absolute -right-2 -top-2 h-16 w-16 opacity-[0.07]"
          style={{ color }}
        />

        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            {title}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold" style={{ color }}>
              {displayValue}
            </span>
            {trend && trend !== "neutral" && (
              <span
                className={`text-xs font-medium ${
                  trend === "up" ? "text-accent-teal" : "text-error"
                }`}
              >
                {trend === "up" ? "\u2191" : "\u2193"}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
