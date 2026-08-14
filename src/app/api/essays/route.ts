import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { essays, studentProfiles, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { CreateEssaySchema } from "@/lib/validators/essay";

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

    const allEssays = await db
      .select()
      .from(essays)
      .where(eq(essays.studentId, student.id))
      .orderBy(desc(essays.updatedAt));

    return NextResponse.json({ data: allEssays });
  } catch (error) {
    console.error("[Essays API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch essays" },
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
    const parsed = CreateEssaySchema.safeParse(body);
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
      .insert(essays)
      .values({
        studentId: student.id,
        title: parsed.data.title,
        prompt: parsed.data.prompt ?? null,
        applicationId: parsed.data.applicationId ?? null,
        content: "",
        wordCount: 0,
        status: "draft",
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[Essays API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create essay" },
      { status: 500 },
    );
  }
}
