"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { TagInput } from "./tag-input";
import type { AboutYouInput } from "@/lib/validators/onboarding";

interface StepAboutYouProps {
  data: Partial<AboutYouInput>;
  onChange: (data: Partial<AboutYouInput>) => void;
}

export function StepAboutYou({ data, onChange }: StepAboutYouProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-text-primary">About You</h2>
        <p className="text-text-secondary">
          Help us personalize your scholarship matches
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Interests</Label>
          <TagInput
            value={data.interests ?? []}
            onChange={(interests) => onChange({ ...data, interests })}
            placeholder="e.g., Computer Science, Robotics (press Enter)"
          />
        </div>

        <div className="space-y-2">
          <Label>Extracurricular Activities</Label>
          <TagInput
            value={data.extracurriculars ?? []}
            onChange={(extracurriculars) =>
              onChange({ ...data, extracurriculars })
            }
            placeholder="e.g., Debate Team, Coding Club (press Enter)"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Ethnicity</Label>
              <span className="text-xs text-text-secondary">(optional)</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3.5 w-3.5 text-text-secondary" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Many scholarships are designated for specific ethnic
                      backgrounds. Sharing this helps us match you with those
                      opportunities.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={data.ethnicity ?? ""}
              onValueChange={(v) => onChange({ ...data, ethnicity: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Prefer not to say" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="african_american">
                  African American / Black
                </SelectItem>
                <SelectItem value="asian">Asian / Pacific Islander</SelectItem>
                <SelectItem value="hispanic">Hispanic / Latino</SelectItem>
                <SelectItem value="native_american">
                  Native American / Alaska Native
                </SelectItem>
                <SelectItem value="white">White / Caucasian</SelectItem>
                <SelectItem value="multiracial">Multiracial</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Gender</Label>
              <span className="text-xs text-text-secondary">(optional)</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3.5 w-3.5 text-text-secondary" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Some scholarships are specifically for certain genders.
                      This helps us find all opportunities available to you.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={data.gender ?? ""}
              onValueChange={(v) => onChange({ ...data, gender: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Prefer not to say" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non_binary">Non-binary</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>First Generation College Student?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3.5 w-3.5 text-text-secondary" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      First-generation status unlocks many dedicated scholarship
                      opportunities.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={
                data.firstGeneration === true
                  ? "yes"
                  : data.firstGeneration === false
                    ? "no"
                    : ""
              }
              onValueChange={(v) =>
                onChange({
                  ...data,
                  firstGeneration:
                    v === "yes" ? true : v === "no" ? false : null,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Prefer not to say" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Financial Need Level</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3.5 w-3.5 text-text-secondary" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Many scholarships are need-based. This helps us match you
                      with financial aid opportunities.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={data.financialNeed ?? ""}
              onValueChange={(v) =>
                onChange({
                  ...data,
                  financialNeed: v as "low" | "medium" | "high",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Prefer not to say" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
