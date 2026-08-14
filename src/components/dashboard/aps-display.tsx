"use client";

import { usePlan } from "@/hooks/use-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Lock, Sparkles } from "lucide-react";
import Link from "next/link";

interface APSDimensions {
  promptSophistication: number;
  criticalEvaluation: number;
  creativeIntegration: number;
  iterativeRefinement: number;
  ethicalAwareness: number;
}

interface APSDisplayProps {
  overallScore: number;
  dimensions: APSDimensions;
}

function getAPSLevel(score: number): { label: string; color: string } {
  if (score >= 85)
    return { label: "Exemplary", color: "bg-[var(--accent-teal)] text-white" };
  if (score >= 70)
    return {
      label: "Proficient",
      color: "bg-[var(--accent-teal)]/20 text-[var(--accent-teal)]",
    };
  if (score >= 50)
    return {
      label: "Developing",
      color: "bg-[var(--highlight-gold)]/20 text-[var(--highlight-gold)]",
    };
  if (score >= 30)
    return {
      label: "Emerging",
      color: "bg-[var(--warning)]/20 text-[var(--warning)]",
    };
  return {
    label: "Foundational",
    color: "bg-gray-100 text-[var(--text-secondary)]",
  };
}

// Radar chart SVG rendered from dimensions
function RadarChart({ dimensions }: { dimensions: APSDimensions }) {
  const labels = [
    { key: "promptSophistication" as const, label: "Prompt" },
    { key: "criticalEvaluation" as const, label: "Critical" },
    { key: "creativeIntegration" as const, label: "Creative" },
    { key: "iterativeRefinement" as const, label: "Iterative" },
    { key: "ethicalAwareness" as const, label: "Ethical" },
  ];

  const cx = 100;
  const cy = 100;
  const maxR = 70;
  const rings = [0.25, 0.5, 0.75, 1.0];
  const count = labels.length;

  function polarToCartesian(
    value: number,
    index: number,
  ): { x: number; y: number } {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (value / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  // Data polygon
  const dataPoints = labels.map((l, i) =>
    polarToCartesian(dimensions[l.key], i),
  );
  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z";

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto">
      {/* Background rings */}
      {rings.map((ring) => {
        const ringPoints = labels.map((_, i) =>
          polarToCartesian(ring * 100, i),
        );
        const ringPath =
          ringPoints
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ") + " Z";
        return (
          <path
            key={ring}
            d={ringPath}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {labels.map((_, i) => {
        const p = polarToCartesian(100, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--border-light)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill="rgba(26, 153, 136, 0.15)"
        stroke="var(--accent-teal)"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent-teal)" />
      ))}

      {/* Labels */}
      {labels.map((l, i) => {
        const labelP = polarToCartesian(120, i);
        return (
          <text
            key={l.key}
            x={labelP.x}
            y={labelP.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-[var(--text-secondary)] text-[8px]"
          >
            {l.label}
          </text>
        );
      })}
    </svg>
  );
}

export function APSDisplay({ overallScore, dimensions }: APSDisplayProps) {
  const { checkFeature, isLoading } = usePlan();
  const level = getAPSLevel(overallScore);

  if (isLoading) {
    return (
      <Card className="border border-[var(--border-light)]">
        <CardContent className="p-4">
          <div className="h-32 animate-pulse rounded-lg bg-gray-50" />
        </CardContent>
      </Card>
    );
  }

  const hasFullAps = checkFeature("apsScoreFull");

  // Gated: show level label only
  if (!hasFullAps) {
    return (
      <Card className="border border-[var(--border-light)] bg-[var(--surface)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-[var(--text-secondary)]" />
            AI Proficiency Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 text-center pb-6">
          <Badge className={level.color}>{level.label}</Badge>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Lock className="h-3 w-3" />
            <span>Upgrade to see your full APS breakdown</span>
          </div>
          <Button
            asChild
            size="sm"
            className="mt-1 bg-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/90 text-white"
          >
            <Link href="/pricing">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Upgrade to Pro
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Full breakdown for paid users
  return (
    <Card className="border border-[var(--border-light)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-[var(--accent-teal)]" />
            AI Proficiency Score
          </CardTitle>
          <Badge className={level.color}>{level.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {/* Radar chart */}
        <RadarChart dimensions={dimensions} />

        {/* Dimension scores */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["Prompt Sophistication", dimensions.promptSophistication],
              ["Critical Evaluation", dimensions.criticalEvaluation],
              ["Creative Integration", dimensions.creativeIntegration],
              ["Iterative Refinement", dimensions.iterativeRefinement],
              ["Ethical Awareness", dimensions.ethicalAwareness],
            ] as const
          ).map(([label, score]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-md bg-gray-50 px-2.5 py-1.5"
            >
              <span className="text-[11px] text-[var(--text-secondary)]">
                {label}
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {score}
              </span>
            </div>
          ))}
        </div>

        {/* Overall */}
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-light)] p-3">
          <span className="text-xs text-[var(--text-secondary)]">Overall</span>
          <span className="text-xl font-bold text-[var(--accent-teal)]">
            {overallScore}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">/ 100</span>
        </div>
      </CardContent>
    </Card>
  );
}
