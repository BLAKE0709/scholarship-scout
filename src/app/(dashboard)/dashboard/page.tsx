"use client";

import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import type { StudentDashboardData } from "@/lib/dashboard/data-fetchers";
import { CounselorDashboard } from "@/components/dashboard/counselor-dashboard";
import { ParentDashboard as ParentDashboardFull } from "@/components/dashboard/parent-dashboard";

// ── Client-side data fetcher (mirrors server-side logic) ──────────────────────

function getFidelityLabel(score: number | null): string {
  if (score === null) return "No Data";
  if (score >= 90) return "Highly Authentic";
  if (score >= 75) return "Authentic";
  if (score >= 60) return "Developing";
  return "Needs Work";
}

function getApsLevel(score: number | null): string {
  if (score === null) return "No Data";
  if (score >= 90) return "Expert";
  if (score >= 75) return "Proficient";
  if (score >= 60) return "Developing";
  return "Beginner";
}

async function fetchStudentDashboard(
  userId: string,
): Promise<StudentDashboardData> {
  const supabase = createClient();

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("id, gpa, sat_score, act_score, interests")
    .eq("user_id", userId)
    .single();

  const { data: userRecord } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .single();

  const studentId = studentProfile?.id;

  if (!studentId) {
    return {
      stats: {
        matchScore: 0,
        matchCount: 0,
        totalMatchValue: 0,
        applicationCount: {
          total: 0,
          submitted: 0,
          inProgress: 0,
          accepted: 0,
        },
        latestFidelityScore: null,
        fidelityLabel: "No Data",
        latestApsScore: null,
        apsLevel: "No Data",
      },
      topMatches: [],
      upcomingDeadlines: [],
      vaultHealth: {
        percentage: 0,
        hasBasicInfo: false,
        hasAcademicScores: false,
        hasInterests: false,
        hasEssay: false,
        hasAchievement: false,
        hasDocument: false,
      },
      recentActivity: [],
    };
  }

  const [
    matchesResult,
    applicationsResult,
    fidelityResult,
    apsResult,
    essaysResult,
    achievementsResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, scholarship_id, match_score, status, created_at, scholarships(id, name, amount_min, amount_max, deadline)",
      )
      .eq("student_id", studentId)
      .order("match_score", { ascending: false }),

    supabase
      .from("applications")
      .select(
        "id, scholarship_id, status, created_at, submitted_at, scholarships(name)",
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),

    supabase
      .from("fidelity_scores")
      .select("id, score, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1),

    supabase
      .from("aps_scores")
      .select("id, score, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1),

    supabase
      .from("essays")
      .select("id, title, status, created_at, updated_at")
      .eq("student_id", studentId)
      .order("updated_at", { ascending: false }),

    supabase
      .from("achievements")
      .select("id, title, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),

    supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
  ]);

  const matchesData = matchesResult.data ?? [];
  const applicationsData = applicationsResult.data ?? [];
  const fidelityData = fidelityResult.data ?? [];
  const apsData = apsResult.data ?? [];
  const essaysData = essaysResult.data ?? [];
  const achievementsData = achievementsResult.data ?? [];
  const documentsData = documentsResult.data ?? [];

  // Stats
  const matchScores = matchesData.map(
    (m: { match_score: number }) => m.match_score,
  );
  const avgMatchScore =
    matchScores.length > 0
      ? Math.round(
          matchScores.reduce((a: number, b: number) => a + b, 0) /
            matchScores.length,
        )
      : 0;

  type ScholarshipJoin = {
    id: string;
    name: string;
    amount_min: number;
    amount_max: number | null;
    deadline: string | null;
  } | null;

  const totalMatchValue = matchesData.reduce(
    (sum: number, m: { scholarships: unknown }) => {
      const s = m.scholarships as ScholarshipJoin;
      if (!s) return sum;
      return sum + (s.amount_max ?? s.amount_min);
    },
    0,
  );

  const submittedStatuses = [
    "submitted",
    "under_review",
    "accepted",
    "rejected",
  ];
  const inProgressStatuses = ["draft", "in_progress"];
  const submitted = applicationsData.filter((a: { status: string | null }) =>
    submittedStatuses.includes(a.status ?? ""),
  ).length;
  const inProgress = applicationsData.filter((a: { status: string | null }) =>
    inProgressStatuses.includes(a.status ?? ""),
  ).length;
  const accepted = applicationsData.filter(
    (a: { status: string | null }) => a.status === "accepted",
  ).length;

  const latestFidelityScore =
    fidelityData.length > 0 ? fidelityData[0].score : null;
  const latestApsScore = apsData.length > 0 ? apsData[0].score : null;

  // Top matches
  const topMatches = matchesData
    .slice(0, 5)
    .map(
      (m: {
        id: string;
        scholarship_id: string;
        match_score: number;
        scholarships: unknown;
      }) => {
        const s = m.scholarships as ScholarshipJoin;
        return {
          id: m.id,
          scholarshipId: m.scholarship_id,
          scholarshipName: s?.name ?? "Unknown Scholarship",
          amount: s?.amount_max ?? s?.amount_min ?? 0,
          deadline: s?.deadline ?? null,
          matchScore: m.match_score,
        };
      },
    );

  // Upcoming deadlines
  const now = new Date();
  const deadlinesRaw: StudentDashboardData["upcomingDeadlines"] = [];
  for (const m of matchesData) {
    const s = (m as { scholarships: unknown }).scholarships as ScholarshipJoin;
    if (!s?.deadline) continue;
    const deadlineDate = new Date(s.deadline);
    if (deadlineDate <= now) continue;
    const daysRemaining = Math.ceil(
      (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    deadlinesRaw.push({
      scholarshipId: s.id,
      scholarshipName: s.name,
      deadline: s.deadline,
      daysRemaining,
    });
  }
  const upcomingDeadlines = deadlinesRaw
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);

  // Vault health
  const hasBasicInfo = !!userRecord?.full_name;
  const hasAcademicScores = !!(
    studentProfile?.gpa ||
    studentProfile?.sat_score ||
    studentProfile?.act_score
  );
  const interests = studentProfile?.interests as string[] | null;
  const hasInterests = !!(interests && interests.length > 0);
  const hasEssay = essaysData.length > 0;
  const hasAchievement = achievementsData.length > 0;
  const hasDocument = documentsData.length > 0;

  const healthChecks = [
    hasBasicInfo,
    hasAcademicScores,
    hasInterests,
    hasEssay,
    hasAchievement,
    hasDocument,
  ];
  const completedCount = healthChecks.filter(Boolean).length;
  const percentage = Math.round((completedCount / healthChecks.length) * 100);

  // Recent activity
  type ActivityItem = StudentDashboardData["recentActivity"][number];
  const recentActivity: ActivityItem[] = [];

  for (const m of matchesData.slice(0, 5)) {
    const s = (m as { scholarships: unknown }).scholarships as ScholarshipJoin;
    recentActivity.push({
      id: (m as { id: string }).id,
      type: "match",
      description: `Matched with "${s?.name ?? "scholarship"}" (${(m as { match_score: number }).match_score}% fit)`,
      timestamp: (m as { created_at: string }).created_at,
    });
  }

  for (const e of essaysData.slice(0, 3)) {
    recentActivity.push({
      id: e.id,
      type: "essay",
      description: `${e.status === "draft" ? "Started" : "Updated"} essay "${e.title}"`,
      timestamp: e.updated_at ?? e.created_at,
    });
  }

  for (const a of applicationsData.slice(0, 3)) {
    const scholarshipName =
      (a.scholarships as unknown as { name: string } | null)?.name ??
      "scholarship";
    const statusLabel =
      a.status === "submitted"
        ? "Submitted application"
        : a.status === "accepted"
          ? "Application accepted"
          : a.status === "rejected"
            ? "Application rejected"
            : "Updated application";
    recentActivity.push({
      id: a.id,
      type: "application",
      description: `${statusLabel} for "${scholarshipName}"`,
      timestamp: a.submitted_at ?? a.created_at,
    });
  }

  if (fidelityData.length > 0) {
    recentActivity.push({
      id: fidelityData[0].id,
      type: "score",
      description: `Fidelity Score updated to ${fidelityData[0].score}`,
      timestamp: fidelityData[0].created_at,
    });
  }

  if (apsData.length > 0) {
    recentActivity.push({
      id: apsData[0].id,
      type: "score",
      description: `AI Proficiency Score updated to ${apsData[0].score}`,
      timestamp: apsData[0].created_at,
    });
  }

  recentActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return {
    stats: {
      matchScore: avgMatchScore,
      matchCount: matchesData.length,
      totalMatchValue,
      applicationCount: {
        total: applicationsData.length,
        submitted,
        inProgress,
        accepted,
      },
      latestFidelityScore,
      fidelityLabel: getFidelityLabel(latestFidelityScore),
      latestApsScore,
      apsLevel: getApsLevel(latestApsScore),
    },
    topMatches,
    upcomingDeadlines,
    vaultHealth: {
      percentage,
      hasBasicInfo,
      hasAcademicScores,
      hasInterests,
      hasEssay,
      hasAchievement,
      hasDocument,
    },
    recentActivity: recentActivity.slice(0, 10),
  };
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-light bg-surface p-4 shadow-sm"
          >
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Content skeleton */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-xl border border-border-light bg-surface p-6 shadow-sm">
            <Skeleton className="h-5 w-32 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border-light bg-surface p-6 shadow-sm">
            <Skeleton className="h-5 w-40 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border-light bg-surface p-6 shadow-sm">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="flex justify-center mb-4">
              <Skeleton className="h-28 w-28 rounded-full" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full mb-2" />
            ))}
          </div>
          <div className="rounded-xl border border-border-light bg-surface p-6 shadow-sm">
            <Skeleton className="h-5 w-32 mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 mb-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// CounselorDashboard imported from @/components/dashboard/counselor-dashboard

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, profile, isLoading: userLoading } = useUser();
  const [dashboardData, setDashboardData] =
    useState<StudentDashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (userId: string) => {
    setDataLoading(true);
    setDataError(null);
    try {
      const data = await fetchStudentDashboard(userId);
      setDashboardData(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load dashboard data";
      setDataError(message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id && profile?.role === "student") {
      loadDashboardData(user.id);
    }
  }, [user?.id, profile?.role, loadDashboardData]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
      </div>
    );
  }

  const role = profile?.role ?? "student";

  return (
    <div className="space-y-6">
      {role !== "parent" && (
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Welcome back, {profile?.fullName ?? "there"}!
          </h2>
          <p className="text-text-secondary">
            Here&apos;s what&apos;s happening with your scholarship journey.
          </p>
        </div>
      )}

      {role === "student" && (
        <>
          {dataLoading && <DashboardSkeleton />}
          {dataError && (
            <div className="rounded-xl border border-error/20 bg-error/5 p-4">
              <p className="text-sm text-error">{dataError}</p>
              <button
                onClick={() => user?.id && loadDashboardData(user.id)}
                className="mt-2 text-xs font-medium text-accent-teal hover:underline"
              >
                Try again
              </button>
            </div>
          )}
          {!dataLoading && !dataError && dashboardData && (
            <StudentDashboard data={dashboardData} />
          )}
          {!dataLoading && !dataError && !dashboardData && (
            <DashboardSkeleton />
          )}
        </>
      )}

      {role === "parent" && <ParentDashboardFull />}
      {role === "counselor" && <CounselorDashboard />}

      {role !== "student" && role !== "parent" && role !== "counselor" && (
        <div className="rounded-xl border border-border-light bg-surface p-8 text-center shadow-sm">
          <p className="text-sm text-text-secondary">
            Dashboard for your role is not yet available.
          </p>
        </div>
      )}
    </div>
  );
}
