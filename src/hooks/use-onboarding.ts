"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildStudentProfileUpdate,
  calculateOnboardingVaultScore,
  requireUpdatedRow,
  type OnboardingData,
} from "@/lib/validators/onboarding";

const TOTAL_STEPS = 6;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "We could not save your profile.";
}

export function useOnboarding(initialStep = 1) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    basics: { educationProfile: { version: 1 } },
    academics: {},
    aboutYou: {},
    goals: {},
  });
  const supabase = createClient();

  const updateStepData = useCallback(
    <K extends keyof OnboardingData>(step: K, stepData: OnboardingData[K]) => {
      setData((previous) => ({ ...previous, [step]: { ...previous[step], ...stepData } }));
      setSaveError(null);
    },
    [],
  );

  const persistProgress = useCallback(
    async (step: number, knownUserId?: string) => {
      let userId = knownUserId;
      if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error("Your session expired. Sign in and try again.");
        userId = authData.user.id;
      }

      const profileUpdate = buildStudentProfileUpdate(data, step);
      if (Object.keys(profileUpdate).length > 0) {
        const result = await supabase
          .from("student_profiles")
          .update(profileUpdate)
          .eq("user_id", userId)
          .select("id")
          .single();
        requireUpdatedRow(result, "Your student profile was not found. Refresh and try again.");
      }

      if (step >= 1 && data.basics.fullName) {
        const result = await supabase
          .from("users")
          .update({ full_name: data.basics.fullName })
          .eq("id", userId)
          .select("id")
          .single();
        requireUpdatedRow(result, "Your account was not found. Refresh and try again.");
      }
      return userId;
    },
    [data, supabase],
  );

  const saveProgress = useCallback(
    async (step: number) => {
      setIsSaving(true);
      setSaveError(null);
      try {
        await persistProgress(step);
      } catch (error) {
        setSaveError(errorMessage(error));
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [persistProgress],
  );

  const completeOnboarding = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Your session expired. Sign in and try again.");

      await persistProgress(4, authData.user.id);
      const score = calculateOnboardingVaultScore(data);
      const scoreResult = await supabase
        .from("student_profiles")
        .update({ vault_health_score: score })
        .eq("user_id", authData.user.id)
        .select("id")
        .single();
      requireUpdatedRow(scoreResult, "Your student profile was not found. Onboarding was not completed.");

      const completeResult = await supabase
        .from("users")
        .update({ onboarding_completed: true })
        .eq("id", authData.user.id)
        .select("id")
        .single();
      requireUpdatedRow(completeResult, "Your account was not found. Onboarding was not completed.");

      let matchCount = 0;
      try {
        const response = await fetch("/api/scholarships/match", { method: "POST" });
        if (response.ok) {
          const body = (await response.json()) as { matchCount?: number };
          matchCount = body.matchCount ?? 0;
        }
      } catch {
        // Completion remains valid; the authenticated dashboard can retry matching.
      }
      setCurrentStep(TOTAL_STEPS);
      return { vaultScore: score, matchCount };
    } catch (error) {
      setSaveError(errorMessage(error));
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [data, persistProgress, supabase]);

  const nextStep = useCallback(async () => {
    await saveProgress(currentStep);
    setCurrentStep((step) => Math.min(step + 1, TOTAL_STEPS));
  }, [currentStep, saveProgress]);
  const prevStep = useCallback(() => setCurrentStep((step) => Math.max(step - 1, 1)), []);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    data,
    isSaving,
    saveError,
    updateStepData,
    nextStep,
    prevStep,
    saveProgress,
    completeOnboarding,
    setCurrentStep,
  };
}
