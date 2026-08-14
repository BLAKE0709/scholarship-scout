import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { achievements, studentProfiles, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createAchievementSchema = z.object({
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
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  organization: z.string().max(200).nullable().optional(),
  dateStart: z.string().nullable().optional(),
  dateEnd: z.string().nullable().optional(),
});

export async function GET() {
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
      return NextResponse.json({ data: [] });
    }

    const data = await db
      .select()
      .from(achievements)
      .where(eq(achievements.studentId, student.id))
      .orderBy(desc(achievements.createdAt));

    // Map to camelCase for frontend consistency
    const mapped = data.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      organization: a.organization,
      dateStart: a.dateStart,
      dateEnd: a.dateEnd,
      verified: a.verified,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error("[Achievements API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
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
    const parsed = createAchievementSchema.safeParse(body);
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

    const [created] = await db
      .insert(achievements)
      .values({
        studentId: student.id,
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        organization: parsed.data.organization ?? null,
        dateStart: parsed.data.dateStart ?? null,
        dateEnd: parsed.data.dateEnd ?? null,
        verified: false,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: created.id,
          type: created.type,
          title: created.title,
          description: created.description,
          organization: created.organization,
          dateStart: created.dateStart,
          dateEnd: created.dateEnd,
          verified: created.verified,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Achievements API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create achievement" },
      { status: 500 },
    );
  }
}
