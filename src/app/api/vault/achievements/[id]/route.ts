import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { achievements, studentProfiles, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateAchievementSchema = z.object({
  type: z
    .enum([
      "academic",
      "athletic",
      "community_service",
      "leadership",
      "arts",
      "work_experience",
      "award",
      "certification",
      "other",
    ])
    .optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  organization: z.string().max(200).nullable().optional(),
  dateStart: z.string().nullable().optional(),
  dateEnd: z.string().nullable().optional(),
});

async function getStudentForAuth(authUserId: string) {
  const [student] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, authUserId))
    .limit(1);
  return student;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateAchievementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const student = await getStudentForAuth(authUser.id);
    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.organization !== undefined)
      updateData.organization = parsed.data.organization;
    if (parsed.data.dateStart !== undefined)
      updateData.dateStart = parsed.data.dateStart;
    if (parsed.data.dateEnd !== undefined)
      updateData.dateEnd = parsed.data.dateEnd;

    const [updated] = await db
      .update(achievements)
      .set(updateData)
      .where(
        and(eq(achievements.id, id), eq(achievements.studentId, student.id)),
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Achievement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        id: updated.id,
        type: updated.type,
        title: updated.title,
        description: updated.description,
        organization: updated.organization,
        dateStart: updated.dateStart,
        dateEnd: updated.dateEnd,
        verified: updated.verified,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("[Achievement API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update achievement" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await getStudentForAuth(authUser.id);
    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    await db
      .delete(achievements)
      .where(
        and(eq(achievements.id, id), eq(achievements.studentId, student.id)),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Achievement API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete achievement" },
      { status: 500 },
    );
  }
}
