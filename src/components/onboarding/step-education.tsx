"use client";

import { EducationFields } from "@/components/profile/education-fields";
import type { BasicsInput } from "@/lib/validators/onboarding";

interface StepEducationProps {
  data: Partial<BasicsInput>;
  onChange: (data: Partial<BasicsInput>) => void;
}

export function StepEducation({ data, onChange }: StepEducationProps) {
  const educationProfile = data.educationProfile ?? { version: 1 as const };
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-text-primary">Your Education</h2>
        <p className="text-text-secondary">
          Tell us where you are now and what credential you are pursuing.
        </p>
      </div>
      <EducationFields
        value={educationProfile}
        onChange={(next) => onChange({ educationProfile: next })}
        legacy={{
          schoolName: data.schoolName,
          graduationYear: data.graduationYear,
          gradeLevel: data.gradeLevel,
        }}
        onLegacyChange={(legacy) => onChange(legacy)}
      />
    </div>
  );
}
