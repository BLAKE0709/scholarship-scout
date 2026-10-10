"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { StepBasics } from "@/components/onboarding/step-basics";
import { StepEducation } from "@/components/onboarding/step-education";
import { StepAcademics } from "@/components/onboarding/step-academics";
import { StepAboutYou } from "@/components/onboarding/step-about-you";
import { StepGoals } from "@/components/onboarding/step-goals";
import { StepComplete } from "@/components/onboarding/step-complete";
import {
  academicsSchema,
  basicsSchema,
  educationStepSchema,
  goalsSchema,
} from "@/lib/validators/onboarding";

export default function OnboardingPage() {
  const { currentStep, totalSteps, data, isSaving, saveError, updateStepData, nextStep, prevStep, completeOnboarding } = useOnboarding();
  const [completionData, setCompletionData] = useState<{ vaultScore: number; matchCount: number } | null>(null);

  async function handleNext() {
    const validation =
      currentStep === 1 ? basicsSchema.safeParse(data.basics)
      : currentStep === 2 ? educationStepSchema.safeParse(data.basics)
      : currentStep === 3 ? academicsSchema.safeParse(data.academics)
      : currentStep === 5 ? goalsSchema.safeParse(data.goals)
      : { success: true as const };
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Check the highlighted information.");
      return;
    }

    try {
      if (currentStep === 5) {
        setCompletionData(await completeOnboarding());
      } else {
        await nextStep();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not save your profile.");
    }
  }

  const formSteps = totalSteps - 1;
  if (currentStep === totalSteps || completionData) {
    return (
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-[#dce5e1] bg-white p-6 shadow-none sm:p-8">
          <StepComplete vaultScore={completionData?.vaultScore ?? 0} matchCount={completionData?.matchCount ?? 0} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-text-secondary"><span>Step {currentStep} of {formSteps}</span><span>{Math.round((currentStep / formSteps) * 100)}%</span></div>
        <Progress value={(currentStep / formSteps) * 100} className="h-1.5" />
      </div>
      <div className="rounded-2xl border border-[#dce5e1] bg-white p-6 shadow-none sm:p-8">
        {currentStep === 1 && <StepBasics data={data.basics} onChange={(next) => updateStepData("basics", next)} />}
        {currentStep === 2 && <StepEducation data={data.basics} onChange={(next) => updateStepData("basics", next)} />}
        {currentStep === 3 && <StepAcademics data={data.academics} educationProfile={data.basics.educationProfile} gradeLevel={data.basics.gradeLevel} onChange={(next) => updateStepData("academics", next)} />}
        {currentStep === 4 && <StepAboutYou data={data.aboutYou} onChange={(next) => updateStepData("aboutYou", next)} />}
        {currentStep === 5 && <StepGoals data={data.goals} onChange={(next) => updateStepData("goals", next)} />}
        {saveError && <p role="alert" className="mt-6 rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">{saveError}</p>}
        <div className="mt-8 flex items-center justify-between">
          {currentStep > 1 ? <button type="button" onClick={prevStep} className="text-sm text-accent-teal hover:underline">Back</button> : <div />}
          <Button onClick={handleNext} className="min-w-[132px] rounded-full bg-[#1a9988] text-white hover:bg-[#0e4f47]" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === 5 ? "Find my matches" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
