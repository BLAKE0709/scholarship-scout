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
import type { AcademicsInput } from "@/lib/validators/onboarding";

interface StepAcademicsProps {
  data: Partial<AcademicsInput>;
  onChange: (data: Partial<AcademicsInput>) => void;
}

export function StepAcademics({ data, onChange }: StepAcademicsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-text-primary">Academics</h2>
        <p className="text-text-secondary">
          This helps us find scholarships you qualify for
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gpa">GPA</Label>
            <Input
              id="gpa"
              type="number"
              step="0.1"
              min="0"
              max="5.0"
              value={data.gpa ?? ""}
              onChange={(e) =>
                onChange({ ...data, gpa: e.target.value as unknown as number })
              }
              placeholder="3.8"
            />
          </div>
          <div className="space-y-2">
            <Label>GPA Scale</Label>
            <Select
              value={data.gpaScale?.toString() ?? "4.0"}
              onValueChange={(v) =>
                onChange({ ...data, gpaScale: parseFloat(v) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4.0">4.0 Scale</SelectItem>
                <SelectItem value="5.0">5.0 Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="satScore">
              SAT Score <span className="text-text-secondary">(optional)</span>
            </Label>
            <Input
              id="satScore"
              type="number"
              min="400"
              max="1600"
              value={data.satScore ?? ""}
              onChange={(e) =>
                onChange({
                  ...data,
                  satScore: e.target.value
                    ? (parseInt(e.target.value) as unknown as number)
                    : ("" as unknown as number),
                })
              }
              placeholder="1350"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="actScore">
              ACT Score <span className="text-text-secondary">(optional)</span>
            </Label>
            <Input
              id="actScore"
              type="number"
              min="1"
              max="36"
              value={data.actScore ?? ""}
              onChange={(e) =>
                onChange({
                  ...data,
                  actScore: e.target.value
                    ? (parseInt(e.target.value) as unknown as number)
                    : ("" as unknown as number),
                })
              }
              placeholder="30"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="intendedMajor">
            Intended Major{" "}
            <span className="text-text-secondary">(optional)</span>
          </Label>
          <Input
            id="intendedMajor"
            value={data.intendedMajor ?? ""}
            onChange={(e) =>
              onChange({ ...data, intendedMajor: e.target.value })
            }
            placeholder="Computer Science"
          />
        </div>
      </div>
    </div>
  );
}
