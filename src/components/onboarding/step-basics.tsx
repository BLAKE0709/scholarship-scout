"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BasicsInput } from "@/lib/validators/onboarding";

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

const GRADE_LEVELS = [
  { value: "freshman", label: "Freshman" },
  { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "college_freshman", label: "College Freshman" },
  { value: "college_sophomore", label: "College Sophomore" },
  { value: "college_junior", label: "College Junior" },
  { value: "college_senior", label: "College Senior" },
];

// Hardcoded start years go stale; derive from the current date instead.
const GRAD_YEARS = Array.from(
  { length: 8 },
  (_, i) => new Date().getFullYear() + i,
);

interface StepBasicsProps {
  data: Partial<BasicsInput>;
  onChange: (data: Partial<BasicsInput>) => void;
}

export function StepBasics({ data, onChange }: StepBasicsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-text-primary">The Basics</h2>
        <p className="text-text-secondary">
          Let&apos;s start with some basic information about you
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={data.fullName ?? ""}
            onChange={(e) => onChange({ ...data, fullName: e.target.value })}
            placeholder="Jane Smith"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>State</Label>
            <Select
              value={data.state ?? ""}
              onValueChange={(v) => onChange({ ...data, state: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={data.city ?? ""}
              onChange={(e) => onChange({ ...data, city: e.target.value })}
              placeholder="Dallas"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schoolName">School Name</Label>
          <Input
            id="schoolName"
            value={data.schoolName ?? ""}
            onChange={(e) => onChange({ ...data, schoolName: e.target.value })}
            placeholder="Highland Park High School"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Graduation Year</Label>
            <Select
              value={data.graduationYear?.toString() ?? ""}
              onValueChange={(v) =>
                onChange({ ...data, graduationYear: parseInt(v) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {GRAD_YEARS.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grade Level</Label>
            <Select
              value={data.gradeLevel ?? ""}
              onValueChange={(v) =>
                onChange({
                  ...data,
                  gradeLevel: v as BasicsInput["gradeLevel"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_LEVELS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
