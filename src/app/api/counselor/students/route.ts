import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface StudentSummary {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  gradeLevel: string | null;
  schoolName: string | null;
  applicationCount: number;
  lastActive: string | null;
  vaultHealthScore: number;
}

export async function GET(request: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const search = searchParams.get("search") ?? "";
    const sortBy = searchParams.get("sort_by") ?? "full_name";
    const sortOrder = searchParams.get("sort_order") ?? "asc";
    const offset = (page - 1) * limit;

    // Get linked student user IDs
    const { data: links } = await supabase
      .from("counselor_students")
      .select("student_id")
      .eq("counselor_id", authUser.id);

    if (!links || links.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    const studentUserIds = links.map((l) => l.student_id);

    // Fetch user records for all linked students
    let usersQuery = supabase
      .from("users")
      .select("id, email, full_name, updated_at", { count: "exact" })
      .in("id", studentUserIds);

    if (search.trim()) {
      usersQuery = usersQuery.ilike("full_name", `%${search.trim()}%`);
    }

    // Apply sorting on user-level fields
    const userSortFields = ["full_name", "email", "updated_at"];
    if (userSortFields.includes(sortBy)) {
      usersQuery = usersQuery.order(sortBy, { ascending: sortOrder === "asc" });
    }

    usersQuery = usersQuery.range(offset, offset + limit - 1);

    const { data: usersData, count: totalCount } = await usersQuery;

    if (!usersData || usersData.length === 0) {
      return NextResponse.json({ data: [], total: totalCount ?? 0 });
    }

    const userIds = usersData.map((u) => u.id);

    // Fetch student profiles for these users
    const { data: profiles } = await supabase
      .from("student_profiles")
      .select("id, user_id, grade_level, school_name, vault_health_score")
      .in("user_id", userIds);

    const profileMap = new Map<
      string,
      {
        id: string;
        gradeLevel: string | null;
        schoolName: string | null;
        vaultHealthScore: number;
      }
    >();
    for (const p of profiles ?? []) {
      profileMap.set(p.user_id, {
        id: p.id,
        gradeLevel: p.grade_level,
        schoolName: p.school_name,
        vaultHealthScore: p.vault_health_score ?? 0,
      });
    }

    // Get student profile IDs for application count query
    const studentProfileIds = (profiles ?? []).map((p) => p.id);

    // Fetch application counts per student profile
    const appCountMap = new Map<string, number>();
    if (studentProfileIds.length > 0) {
      const { data: apps } = await supabase
        .from("applications")
        .select("student_id, id")
        .in("student_id", studentProfileIds);

      for (const app of apps ?? []) {
        appCountMap.set(
          app.student_id,
          (appCountMap.get(app.student_id) ?? 0) + 1,
        );
      }
    }

    // Build response
    const students: StudentSummary[] = usersData.map((u) => {
      const profile = profileMap.get(u.id);
      const appCount = profile ? (appCountMap.get(profile.id) ?? 0) : 0;

      return {
        id: profile?.id ?? u.id,
        userId: u.id,
        fullName: u.full_name ?? "Unknown",
        email: u.email,
        gradeLevel: profile?.gradeLevel ?? null,
        schoolName: profile?.schoolName ?? null,
        applicationCount: appCount,
        lastActive: u.updated_at ?? null,
        vaultHealthScore: profile?.vaultHealthScore ?? 0,
      };
    });

    // Client-sortable fields that aren't in the DB query (grade_level, applicationCount)
    if (sortBy === "grade_level") {
      students.sort((a, b) => {
        const aVal = a.gradeLevel ?? "";
        const bVal = b.gradeLevel ?? "";
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    } else if (sortBy === "application_count") {
      students.sort((a, b) => {
        return sortOrder === "asc"
          ? a.applicationCount - b.applicationCount
          : b.applicationCount - a.applicationCount;
      });
    }

    return NextResponse.json({ data: students, total: totalCount ?? 0 });
  } catch (error) {
    console.error("[Counselor Students API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}
