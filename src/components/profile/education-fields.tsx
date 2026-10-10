"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/onboarding/tag-input";
import { degreeOptions, educationLevelOptions, type EducationProfile } from "@/lib/profiles/education";
import { isGradeCompatibleWithEducation, usesLegacySchoolFields, type BasicsInput } from "@/lib/validators/onboarding";

type LegacyEducation = Pick<Partial<BasicsInput>, "schoolName" | "graduationYear" | "gradeLevel">;
interface EducationFieldsProps {
  value: EducationProfile;
  onChange: (value: EducationProfile) => void;
  legacy?: LegacyEducation;
  onLegacyChange?: (value: LegacyEducation) => void;
}
const enrollmentOptions = [
  { value: "planning", label: "Planning / researching" }, { value: "applied", label: "Applied" },
  { value: "accepted", label: "Accepted" }, { value: "enrolled", label: "Enrolled" },
] as const;
const attendanceOptions = [{ value: "full_time", label: "Full time" }, { value: "part_time", label: "Part time" }] as const;
const studyModeOptions = [{ value: "online", label: "Online" }, { value: "on_campus", label: "On campus" }, { value: "hybrid", label: "Hybrid" }] as const;
const citizenshipOptions = [
  { value: "us_citizen", label: "U.S. citizen" },
  { value: "us_national", label: "U.S. national" },
  { value: "us_permanent_resident", label: "U.S. permanent resident" },
  { value: "canadian_citizen", label: "Canadian citizen" },
  { value: "canadian_permanent_resident", label: "Canadian permanent resident" },
  { value: "daca", label: "DACA recipient" },
  { value: "other", label: "Other / another status" },
] as const;
const schoolGrades = [
  { value: "freshman", label: "Freshman" }, { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" }, { value: "senior", label: "Senior" },
] as const;
const collegeGrades = [
  { value: "college_freshman", label: "College freshman" }, { value: "college_sophomore", label: "College sophomore" },
  { value: "college_junior", label: "College junior" }, { value: "college_senior", label: "College senior" },
] as const;
function ClearButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="text-xs font-medium text-accent-teal hover:underline">Clear</button>;
}

export function EducationFields({ value, onChange, legacy, onLegacyChange }: EducationFieldsProps) {
  function update<K extends keyof EducationProfile>(key: K, next: EducationProfile[K]) {
    onChange({ ...value, [key]: next });
  }
  function changeEducationLevel(next: EducationProfile["educationLevel"]) {
    onChange({ ...value, educationLevel: next });
    if (
      legacy &&
      onLegacyChange &&
      !isGradeCompatibleWithEducation(next, legacy.gradeLevel)
    ) {
      onLegacyChange({ ...legacy, gradeLevel: null });
    }
  }
  const showLegacy = usesLegacySchoolFields(value, legacy?.gradeLevel);
  const grades = value.educationLevel === "undergraduate" ? collegeGrades : schoolGrades;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Education path</Label>
          <Select value={value.educationLevel ?? ""} onValueChange={(next) => changeEducationLevel(next as EducationProfile["educationLevel"])}>
            <SelectTrigger><SelectValue placeholder="Select your path" /></SelectTrigger>
            <SelectContent>{educationLevelOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Highest credential earned</Label>{value.highestDegree != null && <ClearButton onClick={() => update("highestDegree", null)} />}</div>
          <Select value={value.highestDegree ?? ""} onValueChange={(next) => update("highestDegree", next as EducationProfile["highestDegree"])}>
            <SelectTrigger><SelectValue placeholder="Not supplied" /></SelectTrigger>
            <SelectContent>{degreeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Target credential</Label>{value.targetDegree != null && <ClearButton onClick={() => update("targetDegree", null)} />}</div>
          <Select value={value.targetDegree ?? ""} onValueChange={(next) => update("targetDegree", next as EducationProfile["targetDegree"])}>
            <SelectTrigger><SelectValue placeholder="Not supplied" /></SelectTrigger>
            <SelectContent>{degreeOptions.filter((option) => option.value !== "none" && option.value !== "high_school").map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priorField">Prior field of study</Label>
          <Input id="priorField" value={value.priorField ?? ""} onChange={(event) => update("priorField", event.target.value || null)} placeholder="Early childhood education" />
        </div>
      </div>
      {showLegacy && legacy && onLegacyChange && (
        <div className="rounded-xl border border-border-light bg-bg-page p-4">
          <p className="mb-3 text-sm font-medium text-text-primary">Current school details</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="schoolName">School name</Label>
              <Input id="schoolName" value={legacy.schoolName ?? ""} onChange={(event) => onLegacyChange({ ...legacy, schoolName: event.target.value || null })} placeholder="School or college" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="graduationYear">Expected graduation year</Label>
              <Input id="graduationYear" type="number" min="1900" inputMode="numeric" value={legacy.graduationYear ?? ""} onChange={(event) => onLegacyChange({ ...legacy, graduationYear: event.target.value ? Number(event.target.value) : null })} placeholder="2027" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between"><Label>Grade level</Label>{legacy.gradeLevel != null && <ClearButton onClick={() => onLegacyChange({ ...legacy, gradeLevel: null })} />}</div>
              <Select value={legacy.gradeLevel ?? ""} onValueChange={(next) => onLegacyChange({ ...legacy, gradeLevel: next as BasicsInput["gradeLevel"] })}>
                <SelectTrigger><SelectValue placeholder="Not supplied" /></SelectTrigger>
                <SelectContent>{grades.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Enrollment status</Label>{value.enrollmentStatus != null && <ClearButton onClick={() => update("enrollmentStatus", null)} />}</div>
          <Select value={value.enrollmentStatus ?? ""} onValueChange={(next) => update("enrollmentStatus", next as EducationProfile["enrollmentStatus"])}>
            <SelectTrigger><SelectValue placeholder="Not supplied" /></SelectTrigger><SelectContent>{enrollmentOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Attendance</Label>{value.attendance != null && <ClearButton onClick={() => update("attendance", null)} />}</div>
          <Select value={value.attendance ?? ""} onValueChange={(next) => update("attendance", next as EducationProfile["attendance"])}>
            <SelectTrigger><SelectValue placeholder="Not supplied" /></SelectTrigger><SelectContent>{attendanceOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Study mode</Label>{value.studyMode != null && <ClearButton onClick={() => update("studyMode", null)} />}</div>
          <Select value={value.studyMode ?? ""} onValueChange={(next) => update("studyMode", next as EducationProfile["studyMode"])}>
            <SelectTrigger><SelectValue placeholder="Not supplied" /></SelectTrigger><SelectContent>{studyModeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Schools where you completed a degree or credential</Label><TagInput value={value.alumniSchools ?? []} onChange={(schools) => update("alumniSchools", schools)} placeholder="Add a school and press Enter" /></div>
        <div className="space-y-2"><Label>Schools you are considering</Label><TagInput value={value.targetSchools ?? []} onChange={(schools) => update("targetSchools", schools)} placeholder="Add a school and press Enter" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="educationStartDate">Program start date</Label><Input id="educationStartDate" type="date" value={value.startDate ?? ""} onChange={(event) => update("startDate", event.target.value || null)} /></div>
        <div className="space-y-2"><Label htmlFor="educationCompletionDate">Expected completion date</Label><Input id="educationCompletionDate" type="date" value={value.completionDate ?? ""} onChange={(event) => update("completionDate", event.target.value || null)} /></div>
      </div>
      <details className="rounded-xl border border-border-light p-4">
        <summary className="cursor-pointer font-medium text-text-primary">Work, family, and eligibility details (optional)</summary>
        <p className="mt-1 text-sm text-text-secondary">Add only what you want used for scholarship matching. Unknown answers stay unknown.</p>
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="educationGapMonths">Time away from school (months)</Label><Input id="educationGapMonths" type="number" min="0" value={value.educationGapMonths ?? ""} onChange={(event) => update("educationGapMonths", event.target.value ? Number(event.target.value) : null)} /></div>
            <div className="space-y-2"><Label htmlFor="employmentStatus">Employment status</Label><Input id="employmentStatus" value={value.employmentStatus ?? ""} onChange={(event) => update("employmentStatus", event.target.value || null)} placeholder="Employed, seeking work, retired" /></div>
            <div className="space-y-2"><Label htmlFor="employerName">Employer</Label><Input id="employerName" value={value.employerName ?? ""} onChange={(event) => update("employerName", event.target.value || null)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="workExperience">Work experience</Label><Textarea id="workExperience" value={value.workExperience ?? ""} onChange={(event) => update("workExperience", event.target.value || null)} placeholder="Roles, years of experience, or relevant skills" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Caregiving responsibilities</Label><TagInput value={value.caregivingResponsibilities ?? []} onChange={(items) => update("caregivingResponsibilities", items)} placeholder="Add a responsibility and press Enter" /></div>
                        <div className="space-y-2">
              <Label>Citizenship or residency</Label>
              <Select
                value={citizenshipOptions.some((option) => option.value === value.citizenship) ? value.citizenship! : "unknown"}
                onValueChange={(next) => update("citizenship", next === "unknown" ? null : next)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Not supplied</SelectItem>
                  {citizenshipOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {value.citizenship && !citizenshipOptions.some((option) => option.value === value.citizenship) && (
                <p className="text-xs text-highlight-gold">Choose a listed status to replace the saved free-text response.</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Professional or community memberships</Label><TagInput value={value.memberships ?? []} onChange={(items) => update("memberships", items)} placeholder="Add a membership and press Enter" /></div>
            <div className="space-y-2"><Label>Employer or organization sponsorships</Label><TagInput value={value.sponsorships ?? []} onChange={(items) => update("sponsorships", items)} placeholder="Add a sponsorship and press Enter" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Open to a service commitment?</Label>
              <Select value={value.serviceCommitment == null ? "unknown" : value.serviceCommitment ? "yes" : "no"} onValueChange={(next) => update("serviceCommitment", next === "unknown" ? null : next === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Not supplied</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="birthDate">Birth date</Label><Input id="birthDate" type="date" value={value.birthDate ?? ""} onChange={(event) => update("birthDate", event.target.value || null)} /><p className="text-xs text-text-secondary">Used only for age-based eligibility; excluded from AI prompts.</p></div>
          </div>
        </div>
      </details>
    </div>
  );
}
