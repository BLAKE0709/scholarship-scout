"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { StepBasics } from "@/components/onboarding/step-basics";
import { StepAcademics } from "@/components/onboarding/step-academics";
import { StepAboutYou } from "@/components/onboarding/step-about-you";
import { StepGoals } from "@/components/onboarding/step-goals";
import { StepComplete } from "@/components/onboarding/step-complete";
import { basicsSchema, goalsSchema } from "@/lib/validators/onboarding";

export default function OnboardingPage() {
  const {
    currentStep,
    totalSteps,
    data,
    isSaving,
    updateStepData,
    nextStep,
    prevStep,
    completeOnboarding,
  } = useOnboarding();

  const [completionData, setCompletionData] = useState<{
    vaultScore: number;
    matchCount: number;
  } | null>(null);

  async function handleNext() {
    // Validate current step
    if (currentStep === 1) {
      const result = basicsSchema.safeParse(data.basics);
      if (!result.success) {
        toast.error(result.error.issues[0].message);
        return;
      }
    }

    // Step 4 (goals) validation
    if (currentStep === 4) {
      const result = goalsSchema.safeParse(data.goals);
      if (!result.success) {
        toast.error(result.error.issues[0].message);
        return;
      }
      // Complete onboarding
      const result2 = await completeOnboarding();
      setCompletionData(result2);
      return;
    }

    await nextStep();
  }

  const progressPercent = (currentStep / totalSteps) * 100;

  // Step 5: Completion
  if (currentStep === 5 || completionData) {
    return (
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-[#dce5e1] bg-white p-6 shadow-none sm:p-8">
          <StepComplete
            vaultScore={completionData?.vaultScore ?? 0}
            matchCount={completionData?.matchCount ?? 0}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-text-secondary">
          <span>
            Step {currentStep} of {totalSteps - 1}
          </span>
          <span>{Math.round((currentStep / (totalSteps - 1)) * 100)}%</span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-[#dce5e1] bg-white p-6 shadow-none sm:p-8">
        {currentStep === 1 && (
          <StepBasics
            data={data.basics}
            onChange={(d) => updateStepData("basics", d)}
          />
        )}
        {currentStep === 2 && (
          <StepAcademics
            data={data.academics}
            onChange={(d) => updateStepData("academics", d)}
          />
        )}
        {currentStep === 3 && (
          <StepAboutYou
            data={data.aboutYou}
            onChange={(d) => updateStepData("aboutYou", d)}
          />
        )}
        {currentStep === 4 && (
          <StepGoals
            data={data.goals}
            onChange={(d) => updateStepData("goals", d)}
          />
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="text-sm text-accent-teal hover:underline"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleNext}
            className="min-w-[132px] rounded-full bg-[#1a9988] text-white hover:bg-[#0e4f47]"
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === 4 ? "Find my matches" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
