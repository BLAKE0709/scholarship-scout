"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap,
  School,
  Send,
  Activity,
  Shield,
  Fingerprint,
  Brain,
  FileText,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface StudentDetailDrawerProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StudentDetail {
  userId: string;
  fullName: string;
  email: string;
  gradeLevel: string | null;
  schoolName: string | null;
  gpa: string | null;
  vaultHealthScore: number;
  applicationPipeline: Record<string, number>;
  recentActivity: Array<{
    id: string;
    description: string;
    date: string;
  }>;
  latestFidelityScore: number | null;
  latestApsScore: number | null;
  apsLevel: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-text-secondary/10 text-text-secondary border-text-secondary/20",
  in_progress: "bg-accent-teal/10 text-accent-teal border-accent-teal/20",
  submitted: "bg-primary-navy/10 text-primary-navy border-primary-navy/20",
  under_review:
    "bg-highlight-gold/10 text-highlight-gold border-highlight-gold/20",
  accepted: "bg-accent-teal/10 text-accent-teal border-accent-teal/20",
  rejected: "bg-error/10 text-error border-error/20",
  withdrawn:
    "bg-text-secondary/10 text-text-secondary border-text-secondary/20",
};

function getApsLevel(score: number | null): string {
  if (score === null) return "No Data";
  if (score >= 90) return "Expert";
  if (score >= 75) return "Proficient";
  if (score >= 60) return "Developing";
  return "Beginner";
}

function formatGradeLabel(grade: string | null): string {
  if (!grade) return "N/A";
  return grade
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function StudentDetailDrawer({
  studentId,
  open,
  onOpenChange,
}: StudentDetailDrawerProps) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [nudgeSending, setNudgeSending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!open || !studentId) {
      setDetail(null);
      return;
    }

    async function fetchDetail() {
      setLoading(true);
      try {
        // Fetch user info
        const { data: user } = await supabase
          .from("users")
          .select("id, email, full_name")
          .eq("id", studentId)
          .single();

        if (!user) {
          setDetail(null);
          setLoading(false);
          return;
        }

        // Fetch student profile
        const { data: profile } = await supabase
          .from("student_profiles")
          .select("id, gpa, grade_level, school_name, vault_health_score")
          .eq("user_id", studentId)
          .single();

        const studentProfileId = profile?.id;

        // Build application pipeline
        const applicationPipeline: Record<string, number> = {
          draft: 0,
          in_progress: 0,
          submitted: 0,
          under_review: 0,
          accepted: 0,
          rejected: 0,
          withdrawn: 0,
        };

        const recentActivity: Array<{
          id: string;
          description: string;
          date: string;
        }> = [];
        let latestFidelityScore: number | null = null;
        let latestApsScore: number | null = null;

        if (studentProfileId) {
          // Fetch applications
          const { data: apps } = await supabase
            .from("applications")
            .select(
              "id, status, created_at, submitted_at, scholarship_id, scholarships(name)",
            )
            .eq("student_id", studentProfileId)
            .order("created_at", { ascending: false });

          for (const app of apps ?? []) {
            const status = app.status ?? "draft";
            if (status in applicationPipeline) {
              applicationPipeline[status]++;
            }
          }

          // Recent activity: last 5 applications
          for (const app of (apps ?? []).slice(0, 5)) {
            const scholarshipName =
              (app.scholarships as unknown as { name: string } | null)?.name ??
              "scholarship";
            const statusLabel =
              app.status === "submitted"
                ? "Submitted application"
                : app.status === "accepted"
                  ? "Application accepted"
                  : app.status === "rejected"
                    ? "Application rejected"
                    : "Updated application";
            recentActivity.push({
              id: app.id,
              description: `${statusLabel} for "${scholarshipName}"`,
              date: app.submitted_at ?? app.created_at ?? "",
            });
          }

          // Latest fidelity score (aggregate only, NOT essay-level)
          const { data: fidelity } = await supabase
            .from("fidelity_scores")
            .select("score")
            .eq("student_id", studentProfileId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (fidelity && fidelity.length > 0) {
            latestFidelityScore = fidelity[0].score;
          }

          // Latest APS score
          const { data: aps } = await supabase
            .from("aps_scores")
            .select("score")
            .eq("student_id", studentProfileId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (aps && aps.length > 0) {
            latestApsScore = aps[0].score;
          }
        }

        setDetail({
          userId: user.id,
          fullName: user.full_name ?? "Unknown",
          email: user.email,
          gradeLevel: profile?.grade_level ?? null,
          schoolName: profile?.school_name ?? null,
          gpa: profile?.gpa ?? null,
          vaultHealthScore: profile?.vault_health_score ?? 0,
          applicationPipeline,
          recentActivity,
          latestFidelityScore,
          latestApsScore,
          apsLevel: getApsLevel(latestApsScore),
        });
      } catch (err) {
        console.error("[StudentDetailDrawer] fetch error:", err);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [open, studentId, supabase]);

  async function handleNudge() {
    if (!detail) return;
    setNudgeSending(true);
    try {
      const res = await fetch("/api/counselor/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: detail.userId,
          nudgeType: "inactive",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to send nudge");
        return;
      }
      toast.success(`Nudge sent to ${detail.fullName}`);
    } catch {
      toast.error("Network error sending nudge");
    } finally {
      setNudgeSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {loading ? "Loading..." : (detail?.fullName ?? "Student")}
          </SheetTitle>
          <SheetDescription>{detail?.email ?? ""}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 px-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-5 px-4 pb-6">
            {/* Profile summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border-light p-3">
                <School className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-xs text-text-secondary">School</p>
                  <p className="text-sm font-medium text-text-primary truncate">
                    {detail.schoolName ?? "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border-light p-3">
                <GraduationCap className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-xs text-text-secondary">Grade</p>
                  <p className="text-sm font-medium text-text-primary">
                    {formatGradeLabel(detail.gradeLevel)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border-light p-3">
                <FileText className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-xs text-text-secondary">GPA</p>
                  <p className="text-sm font-medium text-text-primary font-mono">
                    {detail.gpa ?? "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border-light p-3">
                <Shield className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-xs text-text-secondary">Vault Health</p>
                  <p className="text-sm font-medium text-text-primary font-mono">
                    {detail.vaultHealthScore}%
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Application pipeline */}
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
                Application Pipeline
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(detail.applicationPipeline)
                  .filter(([, count]) => count > 0)
                  .map(([status, count]) => (
                    <Badge
                      key={status}
                      variant="outline"
                      className={STATUS_COLORS[status] ?? ""}
                    >
                      {status.replace("_", " ")} ({count})
                    </Badge>
                  ))}
                {Object.values(detail.applicationPipeline).every(
                  (c) => c === 0,
                ) && (
                  <p className="text-xs text-text-secondary">
                    No applications yet
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Scores - aggregate only */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border-light p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Fingerprint className="h-4 w-4 text-accent-teal" />
                  <p className="text-xs text-text-secondary">Fidelity Score</p>
                </div>
                <p className="font-mono text-xl font-bold text-text-primary">
                  {detail.latestFidelityScore !== null
                    ? detail.latestFidelityScore
                    : "--"}
                </p>
              </div>
              <div className="rounded-lg border border-border-light p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-highlight-gold" />
                  <p className="text-xs text-text-secondary">APS Score</p>
                </div>
                <p className="font-mono text-xl font-bold text-text-primary">
                  {detail.latestApsScore !== null
                    ? detail.latestApsScore
                    : "--"}
                </p>
                {detail.latestApsScore !== null && (
                  <p className="text-xs text-text-secondary">
                    {detail.apsLevel}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Recent activity */}
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
                Recent Activity
              </h4>
              {detail.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {detail.recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-secondary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-text-primary truncate">
                          {item.description}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-text-secondary">
                          <Clock className="h-3 w-3" />
                          {item.date
                            ? new Date(item.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary">
                  No recent activity
                </p>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleNudge}
                disabled={nudgeSending}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-1" />
                {nudgeSending ? "Sending..." : "Send Nudge"}
              </Button>
              <Button variant="outline" disabled className="flex-1">
                View Full Profile
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-text-secondary">Student not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
