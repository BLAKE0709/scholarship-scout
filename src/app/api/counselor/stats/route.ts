import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface FidelityBucket {
  bucket: string;
  count: number;
}

interface RecentWin {
  studentName: string;
  scholarshipName: string;
  amount: number;
  date: string;
}

interface CounselorStats {
  totalStudents: number;
  activeThisWeek: number;
  totalApplications: number;
  applicationsLastMonth: number;
  dollarsRecovered: number;
  atRiskCount: number;
  fidelityDistribution: FidelityBucket[];
  recentWins: RecentWin[];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify counselor role
    const { data: userRecord } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", authUser.id)
      .single();

    if (!userRecord || userRecord.role !== "counselor") {
      return NextResponse.json(
        { error: "Forbidden: counselor role required" },
        { status: 403 },
      );
    }

    // Get linked student user IDs
    const { data: links } = await supabase
      .from("counselor_students")
      .select("student_id")
      .eq("counselor_id", authUser.id);

    if (!links || links.length === 0) {
      const emptyStats: CounselorStats = {
        totalStudents: 0,
        activeThisWeek: 0,
        totalApplications: 0,
        applicationsLastMonth: 0,
        dollarsRecovered: 0,
        atRiskCount: 0,
        fidelityDistribution: [
          { bucket: "90-100", count: 0 },
          { bucket: "75-89", count: 0 },
          { bucket: "60-74", count: 0 },
          { bucket: "<60", count: 0 },
        ],
        recentWins: [],
      };
      return NextResponse.json(emptyStats);
    }

    const studentUserIds = links.map((l) => l.student_id);
    const totalStudents = studentUserIds.length;

    // Fetch user records for active-this-week check
    const { data: usersData } = await supabase
      .from("users")
      .select("id, full_name, updated_at")
      .in("id", studentUserIds);

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const userMap = new Map<
      string,
      { fullName: string; updatedAt: string | null }
    >();
    let activeThisWeek = 0;
    for (const u of usersData ?? []) {
      userMap.set(u.id, {
        fullName: u.full_name ?? "Unknown",
        updatedAt: u.updated_at,
      });
      if (u.updated_at && new Date(u.updated_at) >= oneWeekAgo) {
        activeThisWeek++;
      }
    }

    // Fetch student profiles
    const { data: profiles } = await supabase
      .from("student_profiles")
      .select("id, user_id, vault_health_score")
      .in("user_id", studentUserIds);

    const profileMap = new Map<
      string,
      { id: string; userId: string; vaultHealthScore: number }
    >();
    const profileIdToUserId = new Map<string, string>();
    const studentProfileIds: string[] = [];
    for (const p of profiles ?? []) {
      profileMap.set(p.user_id, {
        id: p.id,
        userId: p.user_id,
        vaultHealthScore: p.vault_health_score ?? 0,
      });
      profileIdToUserId.set(p.id, p.user_id);
      studentProfileIds.push(p.id);
    }

    // Fetch all applications for linked students
    let totalApplications = 0;
    let applicationsLastMonth = 0;
    let dollarsRecovered = 0;
    const recentWins: RecentWin[] = [];

    if (studentProfileIds.length > 0) {
      const { data: apps } = await supabase
        .from("applications")
        .select(
          "id, student_id, status, submitted_at, created_at, scholarship_id",
        )
        .in("student_id", studentProfileIds);

      const submittedStatuses = [
        "submitted",
        "under_review",
        "accepted",
        "rejected",
      ];
      const acceptedScholarshipIds: string[] = [];
      const acceptedAppMap = new Map<
        string,
        { studentId: string; date: string; scholarshipId: string }
      >();

      for (const app of apps ?? []) {
        if (submittedStatuses.includes(app.status ?? "")) {
          totalApplications++;
          const appDate = app.submitted_at ?? app.created_at;
          if (appDate && new Date(appDate) >= oneMonthAgo) {
            applicationsLastMonth++;
          }
        }

        if (app.status === "accepted") {
          acceptedScholarshipIds.push(app.scholarship_id);
          acceptedAppMap.set(app.scholarship_id, {
            studentId: app.student_id,
            date: app.submitted_at ?? app.created_at ?? now.toISOString(),
            scholarshipId: app.scholarship_id,
          });
        }
      }

      // Fetch scholarship details for accepted applications
      if (acceptedScholarshipIds.length > 0) {
        const { data: scholarships } = await supabase
          .from("scholarships")
          .select("id, name, amount_min, amount_max")
          .in("id", acceptedScholarshipIds);

        for (const s of scholarships ?? []) {
          const amount = s.amount_max ?? s.amount_min;
          dollarsRecovered += amount;

          const appInfo = acceptedAppMap.get(s.id);
          if (appInfo) {
            const userId = profileIdToUserId.get(appInfo.studentId);
            const studentName = userId
              ? (userMap.get(userId)?.fullName ?? "Unknown")
              : "Unknown";
            recentWins.push({
              studentName,
              scholarshipName: s.name,
              amount,
              date: appInfo.date,
            });
          }
        }
      }
    }

    // Sort recent wins by date descending, take 10
    recentWins.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const topWins = recentWins.slice(0, 10);

    // Fidelity distribution
    const fidelityBuckets: FidelityBucket[] = [
      { bucket: "90-100", count: 0 },
      { bucket: "75-89", count: 0 },
      { bucket: "60-74", count: 0 },
      { bucket: "<60", count: 0 },
    ];

    if (studentProfileIds.length > 0) {
      // Get latest fidelity score per student
      const { data: fidelityScores } = await supabase
        .from("fidelity_scores")
        .select("student_id, score, created_at")
        .in("student_id", studentProfileIds)
        .order("created_at", { ascending: false });

      // Deduplicate: keep only latest per student
      const latestScores = new Map<string, number>();
      for (const fs of fidelityScores ?? []) {
        if (!latestScores.has(fs.student_id)) {
          latestScores.set(fs.student_id, fs.score);
        }
      }

      for (const score of latestScores.values()) {
        if (score >= 90) fidelityBuckets[0].count++;
        else if (score >= 75) fidelityBuckets[1].count++;
        else if (score >= 60) fidelityBuckets[2].count++;
        else fidelityBuckets[3].count++;
      }
    }

    // At-risk calculation
    let atRiskCount = 0;
    const atRiskStudentIds = new Set<string>();

    // 1. Inactive 30+ days
    for (const u of usersData ?? []) {
      if (!u.updated_at || new Date(u.updated_at) < oneMonthAgo) {
        atRiskStudentIds.add(u.id);
      }
    }

    // 2. Vault health < 50%
    for (const p of profiles ?? []) {
      if ((p.vault_health_score ?? 0) < 50) {
        atRiskStudentIds.add(p.user_id);
      }
    }

    // 3. Deadline within 7 days with no application
    if (studentProfileIds.length > 0) {
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      const { data: matchesWithDeadlines } = await supabase
        .from("matches")
        .select("student_id, scholarship_id, scholarships(deadline)")
        .in("student_id", studentProfileIds)
        .not("scholarships.deadline", "is", null);

      const { data: existingApps } = await supabase
        .from("applications")
        .select("student_id, scholarship_id")
        .in("student_id", studentProfileIds);

      const appSet = new Set<string>();
      for (const app of existingApps ?? []) {
        appSet.add(`${app.student_id}:${app.scholarship_id}`);
      }

      for (const m of matchesWithDeadlines ?? []) {
        const scholarship = m.scholarships as unknown as {
          deadline: string | null;
        } | null;
        if (!scholarship?.deadline) continue;
        const deadline = new Date(scholarship.deadline);
        if (deadline >= now && deadline <= sevenDaysFromNow) {
          if (!appSet.has(`${m.student_id}:${m.scholarship_id}`)) {
            const userId = profileIdToUserId.get(m.student_id);
            if (userId) atRiskStudentIds.add(userId);
          }
        }
      }
    }

    atRiskCount = atRiskStudentIds.size;

    const stats: CounselorStats = {
      totalStudents,
      activeThisWeek,
      totalApplications,
      applicationsLastMonth,
      dollarsRecovered,
      atRiskCount,
      fidelityDistribution: fidelityBuckets,
      recentWins: topWins,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[Counselor Stats API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch counselor stats" },
      { status: 500 },
    );
  }
}
