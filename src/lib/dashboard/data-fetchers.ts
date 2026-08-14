import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  matchScore: number;
  matchCount: number;
  totalMatchValue: number;
  applicationCount: {
    total: number;
    submitted: number;
    inProgress: number;
    accepted: number;
  };
  latestFidelityScore: number | null;
  fidelityLabel: string;
  latestApsScore: number | null;
  apsLevel: string;
}

export interface TopMatch {
  id: string;
  scholarshipId: string;
  scholarshipName: string;
  amount: number;
  deadline: string | null;
  matchScore: number;
}

export interface UpcomingDeadline {
  scholarshipId: string;
  scholarshipName: string;
  deadline: string;
  daysRemaining: number;
}

export interface VaultHealth {
  percentage: number;
  hasBasicInfo: boolean;
  hasAcademicScores: boolean;
  hasInterests: boolean;
  hasEssay: boolean;
  hasAchievement: boolean;
  hasDocument: boolean;
}

export interface ActivityItem {
  id: string;
  type: "match" | "essay" | "application" | "score";
  description: string;
  timestamp: string;
}

export interface StudentDashboardData {
  stats: DashboardStats;
  topMatches: TopMatch[];
  upcomingDeadlines: UpcomingDeadline[];
  vaultHealth: VaultHealth;
  recentActivity: ActivityItem[];
}

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

export async function getStudentDashboardData(
  userId: string,
): Promise<StudentDashboardData> {
  const supabase = await createClient();

  // First get the student profile ID for this user
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("id, gpa, sat_score, act_score, interests")
    .eq("user_id", userId)
    .single();

  // Also get the user record for basic info check
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

  // Parallel fetch all data
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

  // Calculate stats
  const matchScores = matchesData.map((m) => m.match_score);
  const avgMatchScore =
    matchScores.length > 0
      ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length)
      : 0;

  const totalMatchValue = matchesData.reduce((sum, m) => {
    const scholarship = m.scholarships as unknown as {
      id: string;
      name: string;
      amount_min: number;
      amount_max: number | null;
      deadline: string | null;
    } | null;
    if (!scholarship) return sum;
    return sum + (scholarship.amount_max ?? scholarship.amount_min);
  }, 0);

  const submittedStatuses = [
    "submitted",
    "under_review",
    "accepted",
    "rejected",
  ];
  const inProgressStatuses = ["draft", "in_progress"];
  const submitted = applicationsData.filter((a) =>
    submittedStatuses.includes(a.status ?? ""),
  ).length;
  const inProgress = applicationsData.filter((a) =>
    inProgressStatuses.includes(a.status ?? ""),
  ).length;
  const accepted = applicationsData.filter(
    (a) => a.status === "accepted",
  ).length;

  const latestFidelityScore =
    fidelityData.length > 0 ? fidelityData[0].score : null;
  const latestApsScore = apsData.length > 0 ? apsData[0].score : null;

  const stats: DashboardStats = {
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
  };

  // Top matches (top 5 by score)
  const topMatches: TopMatch[] = matchesData.slice(0, 5).map((m) => {
    const scholarship = m.scholarships as unknown as {
      id: string;
      name: string;
      amount_min: number;
      amount_max: number | null;
      deadline: string | null;
    } | null;
    return {
      id: m.id,
      scholarshipId: m.scholarship_id,
      scholarshipName: scholarship?.name ?? "Unknown Scholarship",
      amount: scholarship?.amount_max ?? scholarship?.amount_min ?? 0,
      deadline: scholarship?.deadline ?? null,
      matchScore: m.match_score,
    };
  });

  // Upcoming deadlines: matches with scholarships that have future deadlines
  const now = new Date();
  const deadlinesRaw: UpcomingDeadline[] = [];
  for (const m of matchesData) {
    const scholarship = m.scholarships as unknown as {
      id: string;
      name: string;
      amount_min: number;
      amount_max: number | null;
      deadline: string | null;
    } | null;
    if (!scholarship?.deadline) continue;
    const deadlineDate = new Date(scholarship.deadline);
    if (deadlineDate <= now) continue;
    const daysRemaining = Math.ceil(
      (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    deadlinesRaw.push({
      scholarshipId: scholarship.id,
      scholarshipName: scholarship.name,
      deadline: scholarship.deadline,
      daysRemaining,
    });
  }
  // Sort by nearest deadline, take top 5
  const upcomingDeadlines = deadlinesRaw
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);

  // Vault health calculation
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

  const vaultHealth: VaultHealth = {
    percentage,
    hasBasicInfo,
    hasAcademicScores,
    hasInterests,
    hasEssay,
    hasAchievement,
    hasDocument,
  };

  // Recent activity (merge latest from each table, sort by timestamp, take 10)
  const recentActivity: ActivityItem[] = [];

  for (const m of matchesData.slice(0, 5)) {
    const scholarship = m.scholarships as unknown as {
      id: string;
      name: string;
      amount_min: number;
      amount_max: number | null;
      deadline: string | null;
    } | null;
    recentActivity.push({
      id: m.id,
      type: "match",
      description: `Matched with "${scholarship?.name ?? "scholarship"}" (${m.match_score}% fit)`,
      timestamp: m.created_at,
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

  // Sort by timestamp descending, take 10
  recentActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return {
    stats,
    topMatches,
    upcomingDeadlines,
    vaultHealth,
    recentActivity: recentActivity.slice(0, 10),
  };
}
