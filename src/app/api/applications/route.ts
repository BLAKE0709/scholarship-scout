import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  applications,
  scholarships,
  essays,
  studentProfiles,
  users,
} from "@/lib/db/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { createApplicationSchema } from "@/lib/validators/application";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [student] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!student) {
      return NextResponse.json({ data: [], total: 0, page: 1 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const statusFilter = searchParams.get("status");
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(applications.studentId, student.id)];
    if (
      statusFilter &&
      [
        "draft",
        "in_progress",
        "submitted",
        "under_review",
        "accepted",
        "rejected",
        "withdrawn",
      ].includes(statusFilter)
    ) {
      conditions.push(
        eq(
          applications.status,
          statusFilter as
            | "draft"
            | "in_progress"
            | "submitted"
            | "under_review"
            | "accepted"
            | "rejected"
            | "withdrawn",
        ),
      );
    }

    const whereClause = and(...conditions);

    // Get total count
    const [totalResult] = await db
      .select({ value: count() })
      .from(applications)
      .where(whereClause);

    const total = totalResult?.value ?? 0;

    // Fetch applications with scholarship data
    const rows = await db
      .select({
        id: applications.id,
        studentId: applications.studentId,
        scholarshipId: applications.scholarshipId,
        matchId: applications.matchId,
        status: applications.status,
        submittedAt: applications.submittedAt,
        notes: applications.notes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        scholarshipName: scholarships.name,
        amountMin: scholarships.amountMin,
        amountMax: scholarships.amountMax,
        deadline: scholarships.deadline,
      })
      .from(applications)
      .innerJoin(scholarships, eq(applications.scholarshipId, scholarships.id))
      .where(whereClause)
      .orderBy(desc(applications.updatedAt))
      .limit(limit)
      .offset(offset);

    // Count linked essays per application
    const appIds = rows.map((r) => r.id);
    let essayCountMap: Record<string, number> = {};
    if (appIds.length > 0) {
      const essayCounts = await db
        .select({
          applicationId: essays.applicationId,
          count: count(),
        })
        .from(essays)
        .where(
          sql`${essays.applicationId} IN (${sql.join(
            appIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        )
        .groupBy(essays.applicationId);

      essayCountMap = Object.fromEntries(
        essayCounts
          .filter((e) => e.applicationId !== null)
          .map((e) => [e.applicationId!, e.count]),
      );
    }

    const data = rows.map((row) => ({
      ...row,
      essayCount: essayCountMap[row.id] ?? 0,
    }));

    return NextResponse.json({ data, total, page });
  } catch (error) {
    console.error("[Applications API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const [student] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    // Verify scholarship exists
    const [scholarship] = await db
      .select({ id: scholarships.id, name: scholarships.name })
      .from(scholarships)
      .where(eq(scholarships.id, parsed.data.scholarshipId))
      .limit(1);

    if (!scholarship) {
      return NextResponse.json(
        { error: "Scholarship not found" },
        { status: 404 },
      );
    }

    // Check for duplicate application
    const [existing] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.studentId, student.id),
          eq(applications.scholarshipId, parsed.data.scholarshipId),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Application already exists for this scholarship" },
        { status: 409 },
      );
    }

    const [created] = await db
      .insert(applications)
      .values({
        studentId: student.id,
        scholarshipId: parsed.data.scholarshipId,
        matchId: parsed.data.matchId ?? null,
        notes: parsed.data.notes ?? null,
        status: "draft",
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[Applications API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 },
    );
  }
}
