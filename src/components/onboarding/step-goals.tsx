"use client";

import { Search, PenTool, FileText, Brain, Archive } from "lucide-react";
import type { GoalsInput } from "@/lib/validators/onboarding";

const GOALS = [
  {
    id: "find_scholarships",
    label: "Find scholarships I qualify for",
    description: "Get matched with scholarships based on your unique profile",
    icon: Search,
  },
  {
    id: "essay_help",
    label: "Get help writing essays",
    description:
      "AI-powered writing assistance that keeps your authentic voice",
    icon: PenTool,
  },
  {
    id: "track_applications",
    label: "Track my applications",
    description: "Stay organized with deadlines, statuses, and reminders",
    icon: FileText,
  },
  {
    id: "ai_skills",
    label: "Improve my AI collaboration skills",
    description: "Build your AI Partnership Score and stand out to reviewers",
    icon: Brain,
  },
  {
    id: "build_profile",
    label: "Build my academic profile",
    description: "Create a comprehensive vault of your achievements",
    icon: Archive,
  },
];

interface StepGoalsProps {
  data: Partial<GoalsInput>;
  onChange: (data: Partial<GoalsInput>) => void;
}

export function StepGoals({ data, onChange }: StepGoalsProps) {
  const selected = data.goals ?? [];

  function toggleGoal(id: string) {
    if (selected.includes(id)) {
      onChange({ goals: selected.filter((g) => g !== id) });
    } else {
      onChange({ goals: [...selected, id] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-text-primary">Your Goals</h2>
        <p className="text-text-secondary">
          What are you hoping to achieve? Select all that apply.
        </p>
      </div>

      <div className="space-y-3">
        {GOALS.map((goal) => {
          const isSelected = selected.includes(goal.id);
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => toggleGoal(goal.id)}
              className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 ${
                isSelected
                  ? "border-accent-teal bg-accent-teal/5"
                  : "border-border-light hover:border-accent-teal/30 hover:bg-bg-page"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? "bg-accent-teal text-white"
                    : "bg-bg-page text-text-secondary"
                }`}
              >
                <goal.icon className="h-5 w-5" />
              </div>
              <div>
                <p
                  className={`font-medium ${
                    isSelected ? "text-accent-teal" : "text-text-primary"
                  }`}
                >
                  {goal.label}
                </p>
                <p className="text-sm text-text-secondary">
                  {goal.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
