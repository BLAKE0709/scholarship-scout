"use client";

import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const achievementSchema = z.object({
  type: z.enum([
    "academic",
    "athletic",
    "community_service",
    "leadership",
    "arts",
    "work_experience",
    "award",
    "certification",
    "other",
  ]),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be under 200 characters"),
  description: z.string().max(2000).optional().or(z.literal("")),
  organization: z.string().max(200).optional().or(z.literal("")),
  dateStart: z.string().optional().or(z.literal("")),
  dateEnd: z.string().optional().or(z.literal("")),
});

type AchievementInput = z.infer<typeof achievementSchema>;

interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string | null;
  organization: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  verified: boolean;
}

const TYPE_OPTIONS = [
  { value: "academic", label: "Academic" },
  { value: "athletic", label: "Athletic" },
  { value: "community_service", label: "Community Service" },
  { value: "leadership", label: "Leadership" },
  { value: "arts", label: "Arts" },
  { value: "work_experience", label: "Work Experience" },
  { value: "award", label: "Award" },
  { value: "certification", label: "Certification" },
  { value: "other", label: "Other" },
];

interface AchievementFormProps {
  studentId: string;
  achievement?: Achievement;
  onSave: () => void;
  onCancel: () => void;
}

export function AchievementForm({
  studentId,
  achievement,
  onSave,
  onCancel,
}: AchievementFormProps) {
  const isEditing = !!achievement;

  const [formData, setFormData] = useState<AchievementInput>({
    type: (achievement?.type as AchievementInput["type"]) ?? "academic",
    title: achievement?.title ?? "",
    description: achievement?.description ?? "",
    organization: achievement?.organization ?? "",
    dateStart: achievement?.dateStart ?? "",
    dateEnd: achievement?.dateEnd ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field: keyof AchievementInput, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = achievementSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description || null,
        organization: parsed.data.organization || null,
        dateStart: parsed.data.dateStart || null,
        dateEnd: parsed.data.dateEnd || null,
      };

      let response: Response;

      if (isEditing && achievement) {
        response = await fetch(`/api/vault/achievements/${achievement.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch("/api/vault/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save achievement");
      }

      onSave();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save achievement";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Achievement" : "Add Achievement"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Type
            </label>
            <Select
              value={formData.type}
              onValueChange={(val) => handleChange("type", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-error">{errors.type}</p>}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Title
            </label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g., National Honor Society"
              maxLength={200}
            />
            {errors.title && (
              <p className="text-xs text-error">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe your involvement and impact..."
              rows={3}
              maxLength={2000}
            />
            {errors.description && (
              <p className="text-xs text-error">{errors.description}</p>
            )}
          </div>

          {/* Organization */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Organization
            </label>
            <Input
              value={formData.organization}
              onChange={(e) => handleChange("organization", e.target.value)}
              placeholder="e.g., Lincoln High School"
              maxLength={200}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">
                Start Date
              </label>
              <Input
                type="date"
                value={formData.dateStart}
                onChange={(e) => handleChange("dateStart", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">
                End Date
                <span className="ml-1 text-xs text-text-secondary font-normal">
                  (optional)
                </span>
              </label>
              <Input
                type="date"
                value={formData.dateEnd}
                onChange={(e) => handleChange("dateEnd", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Update Achievement"
                  : "Add Achievement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
