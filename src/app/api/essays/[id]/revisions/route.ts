import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  essays,
  essayRevisions,
  studentProfiles,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { CreateRevisionSchema } from "@/lib/validators/essay";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const [student] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [essay] = await db
      .select({ id: essays.id })
      .from(essays)
      .where(and(eq(essays.id, id), eq(essays.studentId, student.id)))
      .limit(1);

    if (!essay) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }

    const revisions = await db
      .select()
      .from(essayRevisions)
      .where(eq(essayRevisions.essayId, id))
      .orderBy(desc(essayRevisions.revisionNumber));

    return NextResponse.json({ data: revisions });
  } catch (error) {
    console.error("[Revisions API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revisions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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
    const parsed = CreateRevisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Verify ownership
    const [student] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [essay] = await db
      .select({ id: essays.id })
      .from(essays)
      .where(and(eq(essays.id, id), eq(essays.studentId, student.id)))
      .limit(1);

    if (!essay) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }

    // Get next revision number
    const [maxRev] = await db
      .select({
        max: sql<number>`coalesce(max(${essayRevisions.revisionNumber}), 0)`,
      })
      .from(essayRevisions)
      .where(eq(essayRevisions.essayId, id));

    const nextRevision = (maxRev?.max ?? 0) + 1;

    const [created] = await db
      .insert(essayRevisions)
      .values({
        essayId: id,
        content: parsed.data.content,
        revisionNumber: nextRevision,
        wordCount: parsed.data.wordCount ?? 0,
        timeSpentSeconds: parsed.data.timeSpentSeconds ?? 0,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[Revisions API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create revision" },
      { status: 500 },
    );
  }
}
