"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EducationProfile } from "@/lib/profiles/education";
import { shouldShowSchoolTests, type AcademicsInput } from "@/lib/validators/onboarding";

interface StepAcademicsProps {
  data: Partial<AcademicsInput>;
  educationProfile?: EducationProfile;
  gradeLevel?: string | null;
  onChange: (data: Partial<AcademicsInput>) => void;
}
export function StepAcademics({ data, educationProfile, gradeLevel, onChange }: StepAcademicsProps) {
  const showSchoolTests = shouldShowSchoolTests(educationProfile, gradeLevel);
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-text-primary">Academics</h2>
        <p className="text-text-secondary">Share only the academic details that apply to your path.</p>
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gpa">GPA <span className="text-text-secondary">(optional)</span></Label>
            <Input id="gpa" type="number" step="0.1" min="0" max="5" value={data.gpa ?? ""} onChange={(event) => onChange({ ...data, gpa: event.target.value ? Number(event.target.value) : "" })} placeholder="3.8" />
          </div>
          <div className="space-y-2">
            <Label>GPA scale</Label>
            <Select value={data.gpaScale?.toString() ?? "4"} onValueChange={(next) => onChange({ ...data, gpaScale: Number(next) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="4">4.0 scale</SelectItem><SelectItem value="5">5.0 scale</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        {showSchoolTests && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="satScore">SAT score <span className="text-text-secondary">(optional)</span></Label>
              <Input id="satScore" type="number" min="400" max="1600" value={data.satScore ?? ""} onChange={(event) => onChange({ ...data, satScore: event.target.value ? Number(event.target.value) : "" })} placeholder="1350" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actScore">ACT score <span className="text-text-secondary">(optional)</span></Label>
              <Input id="actScore" type="number" min="1" max="36" value={data.actScore ?? ""} onChange={(event) => onChange({ ...data, actScore: event.target.value ? Number(event.target.value) : "" })} placeholder="30" />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="intendedMajor">Target field of study <span className="text-text-secondary">(optional)</span></Label>
          <Input id="intendedMajor" value={data.intendedMajor ?? ""} onChange={(event) => onChange({ ...data, intendedMajor: event.target.value || null })} placeholder="Social work" />
        </div>
      </div>
    </div>
  );
}
