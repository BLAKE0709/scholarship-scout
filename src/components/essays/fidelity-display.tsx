"use client";

import { usePlan } from "@/hooks/use-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

interface FidelityDimension {
  label: string;
  score: number;
}

interface FidelityDisplayProps {
  overallScore: number;
  dimensions: {
    stylisticConsistency: number;
    processAuthenticity: number;
    aiIntegrationQuality: number;
    vocabularyAlignment: number;
    conceptualOriginality: number;
  };
}

function ScoreBar({ label, score }: FidelityDimension) {
  const color =
    score >= 80
      ? "bg-[var(--accent-teal)]"
      : score >= 60
        ? "bg-[var(--highlight-gold)]"
        : "bg-[var(--error)]";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          {score}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function FidelityDisplay({
  overallScore,
  dimensions,
}: FidelityDisplayProps) {
  const { checkFeature, isLoading } = usePlan();

  if (isLoading) {
    return (
      <Card className="border border-[var(--border-light)]">
        <CardContent className="p-4">
          <div className="h-32 animate-pulse rounded-lg bg-gray-50" />
        </CardContent>
      </Card>
    );
  }

  const hasFidelity = checkFeature("fidelityScore");

  if (!hasFidelity) {
    return (
      <Card className="border border-[var(--border-light)] bg-[var(--surface)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-[var(--text-secondary)]" />
            Fidelity Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 text-center pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
            <span className="text-2xl font-bold text-[var(--text-secondary)]">
              ??
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Lock className="h-3 w-3" />
            <span>Upgrade to see your Fidelity Score</span>
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
  const overallColor =
    overallScore >= 80
      ? "text-[var(--accent-teal)]"
      : overallScore >= 60
        ? "text-[var(--highlight-gold)]"
        : "text-[var(--error)]";

  return (
    <Card className="border border-[var(--border-light)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-[var(--accent-teal)]" />
          Fidelity Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {/* Overall score */}
        <div className="flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--border-light)]">
            <span className={`text-2xl font-bold ${overallColor}`}>
              {overallScore}
            </span>
          </div>
        </div>

        {/* Dimension breakdown */}
        <div className="space-y-2.5">
          <ScoreBar
            label="Stylistic Consistency"
            score={dimensions.stylisticConsistency}
          />
          <ScoreBar
            label="Process Authenticity"
            score={dimensions.processAuthenticity}
          />
          <ScoreBar
            label="AI Integration Quality"
            score={dimensions.aiIntegrationQuality}
          />
          <ScoreBar
            label="Vocabulary Alignment"
            score={dimensions.vocabularyAlignment}
          />
          <ScoreBar
            label="Conceptual Originality"
            score={dimensions.conceptualOriginality}
          />
        </div>
      </CardContent>
    </Card>
  );
}
