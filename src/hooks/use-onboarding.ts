"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OnboardingData } from "@/lib/validators/onboarding";

const TOTAL_STEPS = 5;

export function useOnboarding(initialStep = 1) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    basics: {},
    academics: {},
    aboutYou: {},
    goals: {},
  });

  const supabase = createClient();

  const updateStepData = useCallback(
    <K extends keyof OnboardingData>(step: K, stepData: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [step]: { ...prev[step], ...stepData } }));
    },
    [],
  );

  const saveProgress = useCallback(
    async (step: number) => {
      setIsSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsSaving(false);
        return;
      }

      const profileUpdate: Record<string, unknown> = {};

      if (step >= 1 && data.basics) {
        if (data.basics.state) profileUpdate.state = data.basics.state;
        if (data.basics.city) profileUpdate.city = data.basics.city;
        if (data.basics.schoolName)
          profileUpdate.school_name = data.basics.schoolName;
        if (data.basics.graduationYear)
          profileUpdate.graduation_year = data.basics.graduationYear;
        if (data.basics.gradeLevel)
          profileUpdate.grade_level = data.basics.gradeLevel;
      }

      if (step >= 2 && data.academics) {
        if (data.academics.gpa != null && data.academics.gpa !== "")
          profileUpdate.gpa = data.academics.gpa;
        if (data.academics.gpaScale)
          profileUpdate.gpa_scale = data.academics.gpaScale;
        if (data.academics.satScore != null && data.academics.satScore !== "")
          profileUpdate.sat_score = data.academics.satScore;
        if (data.academics.actScore != null && data.academics.actScore !== "")
          profileUpdate.act_score = data.academics.actScore;
        if (data.academics.intendedMajor)
          profileUpdate.intended_major = data.academics.intendedMajor;
      }

      if (step >= 3 && data.aboutYou) {
        if (data.aboutYou.interests)
          profileUpdate.interests = data.aboutYou.interests;
        if (data.aboutYou.extracurriculars)
          profileUpdate.extracurriculars = data.aboutYou.extracurriculars;
        if (data.aboutYou.ethnicity)
          profileUpdate.ethnicity = data.aboutYou.ethnicity;
        if (data.aboutYou.gender) profileUpdate.gender = data.aboutYou.gender;
        if (data.aboutYou.firstGeneration !== undefined)
          profileUpdate.first_generation = data.aboutYou.firstGeneration;
        if (data.aboutYou.financialNeed)
          profileUpdate.financial_need = data.aboutYou.financialNeed;
      }

      // Update student profile
      if (Object.keys(profileUpdate).length > 0) {
        await supabase
          .from("student_profiles")
          .update(profileUpdate)
          .eq("user_id", user.id);
      }

      // Update user name if we have it
      if (data.basics.fullName) {
        await supabase
          .from("users")
          .update({ full_name: data.basics.fullName })
          .eq("id", user.id);
      }

      setIsSaving(false);
    },
    [supabase, data],
  );

  const completeOnboarding = useCallback(async () => {
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsSaving(false);
      return { vaultScore: 0, matchCount: 0 };
    }

    // Calculate vault health score
    let score = 0;
    if (data.basics.state) score += 10;
    if (data.basics.schoolName) score += 5;
    if (data.basics.graduationYear) score += 10;
    if (data.basics.gradeLevel) score += 5;
    if (data.academics.gpa != null && data.academics.gpa !== "") score += 15;
    if (data.academics.satScore != null && data.academics.satScore !== "")
      score += 10;
    if (data.academics.actScore != null && data.academics.actScore !== "")
      score += 10;
    if (data.academics.intendedMajor) score += 5;
    if (data.aboutYou.interests && data.aboutYou.interests.length > 0)
      score += 10;
    if (
      data.aboutYou.extracurriculars &&
      data.aboutYou.extracurriculars.length > 0
    )
      score += 10;
    if (data.aboutYou.financialNeed) score += 5;
    if (data.aboutYou.firstGeneration !== undefined) score += 5;

    // Save final data + mark complete
    await saveProgress(4);

    await supabase
      .from("student_profiles")
      .update({ vault_health_score: score })
      .eq("user_id", user.id);

    await supabase
      .from("users")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    // Run the real matching engine against the verified scholarship database.
    // The completion screen must never show an invented number: if matching
    // fails here, report 0 and let the dashboard's match runner retry — an
    // honest zero beats a fabricated eleven.
    let matchCount = 0;
    try {
      const res = await fetch("/api/scholarships/match", { method: "POST" });
      if (res.ok) {
        const body = (await res.json()) as { matchCount?: number };
        matchCount = body.matchCount ?? 0;
      }
    } catch {
      // Non-fatal: matches can be generated from the dashboard afterward.
    }

    setIsSaving(false);

    return { vaultScore: score, matchCount };
  }, [supabase, data, saveProgress]);

  const nextStep = useCallback(async () => {
    await saveProgress(currentStep);
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, [currentStep, saveProgress]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    data,
    isSaving,
    updateStepData,
    nextStep,
    prevStep,
    saveProgress,
    completeOnboarding,
    setCurrentStep,
  };
}
