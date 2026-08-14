"use client";

import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ApplicationSummary {
  id: string;
  status: string;
  submittedAt: string | null;
  scholarshipName: string;
  amountMin: number;
  amountMax: number | null;
  deadline: string | null;
}

interface StudentStats {
  totalApplications: number;
  submitted: number;
  inProgress: number;
  drafts: number;
  accepted: number;
  totalValueApplied: number;
  totalValueWon: number;
}

interface StudentProfile {
  schoolName: string | null;
  gradeLevel: string | null;
  graduationYear: number;
  state: string;
  city: string | null;
}

export interface LinkedStudentData {
  student: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    lastActive: string | null;
  };
  profile: StudentProfile | null;
  applications: ApplicationSummary[];
  upcomingDeadlines: {
    scholarshipName: string;
    deadline: string | null;
    amountMin: number;
    amountMax: number | null;
    matchScore: number;
  }[];
  stats: StudentStats;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatGradeLevel(grade: string | null): string {
  if (!grade) return "";
  return grade
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return "text-text-secondary";
  const days = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days < 7) return "text-error";
  if (days < 30) return "text-warning";
  return "text-accent-teal";
}

function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "accepted":
      return "default";
    case "submitted":
    case "under_review":
      return "secondary";
    case "rejected":
    case "withdrawn":
      return "destructive";
    default:
      return "outline";
  }
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface StudentOverviewCardProps {
  data: LinkedStudentData;
}

export function StudentOverviewCard({ data }: StudentOverviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { student, profile, applications, upcomingDeadlines, stats } = data;

  const pipelineTotal = stats.drafts + stats.inProgress + stats.submitted;
  const draftPct = pipelineTotal > 0 ? (stats.drafts / pipelineTotal) * 100 : 0;
  const inProgressPct =
    pipelineTotal > 0 ? (stats.inProgress / pipelineTotal) * 100 : 0;
  const submittedPct =
    pipelineTotal > 0 ? (stats.submitted / pipelineTotal) * 100 : 0;

  return (
    <Card className="rounded-xl border border-border-light shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            {student.avatarUrl ? (
              <AvatarImage
                src={student.avatarUrl}
                alt={student.fullName ?? "Student"}
              />
            ) : null}
            <AvatarFallback className="bg-primary-navy text-white text-sm">
              {getInitials(student.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg text-text-primary">
              {student.fullName ?? "Student"}
            </CardTitle>
            {profile && (
              <p className="text-sm text-text-secondary">
                {profile.schoolName ?? "School not set"}
                {profile.gradeLevel
                  ? ` \u00B7 ${formatGradeLevel(profile.gradeLevel)}`
                  : ""}
                {profile.graduationYear
                  ? ` \u00B7 Class of ${profile.graduationYear}`
                  : ""}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-text-secondary"
        >
          {expanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-teal/10">
              <FileText className="h-4 w-4 text-accent-teal" />
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-text-primary">
                {stats.submitted}
              </p>
              <p className="text-xs text-text-secondary">Submitted</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-highlight-gold/10">
              <DollarSign className="h-4 w-4 text-highlight-gold" />
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-text-primary">
                {formatCurrency(stats.totalValueApplied)}
              </p>
              <p className="text-xs text-text-secondary">Applied For</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-teal/10">
              <DollarSign className="h-4 w-4 text-accent-teal" />
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-text-primary">
                {formatCurrency(stats.totalValueWon)}
              </p>
              <p className="text-xs text-text-secondary">Won</p>
            </div>
          </div>
        </div>

        {/* Mini Pipeline Bar */}
        {pipelineTotal > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
              <span>Application Pipeline</span>
              <span>{pipelineTotal} total</span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-page">
              {draftPct > 0 && (
                <div
                  className="bg-text-secondary/40 transition-all"
                  style={{ width: `${draftPct}%` }}
                  title={`${stats.drafts} draft`}
                />
              )}
              {inProgressPct > 0 && (
                <div
                  className="bg-highlight-gold transition-all"
                  style={{ width: `${inProgressPct}%` }}
                  title={`${stats.inProgress} in progress`}
                />
              )}
              {submittedPct > 0 && (
                <div
                  className="bg-accent-teal transition-all"
                  style={{ width: `${submittedPct}%` }}
                  title={`${stats.submitted} submitted`}
                />
              )}
            </div>
            <div className="mt-1 flex gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-text-secondary/40" />
                {stats.drafts} Draft
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-highlight-gold" />
                {stats.inProgress} In Progress
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-accent-teal" />
                {stats.submitted} Submitted
              </span>
            </div>
          </div>
        )}

        {/* Last Activity */}
        {student.lastActive && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Clock className="h-3 w-3" />
            <span>
              Last active{" "}
              {formatDistanceToNow(new Date(student.lastActive), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}

        {/* Expanded Section */}
        {expanded && (
          <div className="space-y-6 pt-2">
            {/* Submitted Applications */}
            {applications.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-text-primary">
                  Applications
                </h4>
                <div className="space-y-2">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {app.scholarshipName}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatCurrency(app.amountMax ?? app.amountMin)}
                          {app.deadline
                            ? ` \u00B7 Due ${new Date(app.deadline).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(app.status)}>
                        {formatStatusLabel(app.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Deadlines */}
            {upcomingDeadlines.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-text-primary">
                  Upcoming Deadlines
                </h4>
                <div className="space-y-2">
                  {upcomingDeadlines.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {d.scholarshipName}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatCurrency(d.amountMax ?? d.amountMin)}
                          {" \u00B7 "}
                          {d.matchScore}% match
                        </p>
                      </div>
                      {d.deadline && (
                        <span
                          className={`whitespace-nowrap text-sm font-medium ${getDeadlineColor(d.deadline)}`}
                        >
                          {new Date(d.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievement Summary */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-text-primary">
                Achievement Summary
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border-light p-3 text-center">
                  <p className="font-mono text-xl font-bold text-text-primary">
                    {stats.totalApplications}
                  </p>
                  <p className="text-xs text-text-secondary">Total Apps</p>
                </div>
                <div className="rounded-lg border border-border-light p-3 text-center">
                  <p className="font-mono text-xl font-bold text-text-primary">
                    {formatCurrency(stats.totalValueApplied)}
                  </p>
                  <p className="text-xs text-text-secondary">Total Value</p>
                </div>
                <div className="rounded-lg border border-border-light p-3 text-center">
                  <p className="font-mono text-xl font-bold text-text-primary">
                    {stats.totalApplications > 0
                      ? Math.round(
                          ((stats.submitted + stats.accepted) /
                            stats.totalApplications) *
                            100,
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-text-secondary">Completion Rate</p>
                </div>
                <div className="rounded-lg border border-border-light p-3 text-center">
                  <p className="font-mono text-xl font-bold text-accent-teal">
                    {stats.accepted}
                  </p>
                  <p className="text-xs text-text-secondary">Accepted</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
