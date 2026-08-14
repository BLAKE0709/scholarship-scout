import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  essays,
  essayRevisions,
  studentProfiles,
  users,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { UpdateEssaySchema } from "@/lib/validators/essay";

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
      .select()
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

    return NextResponse.json({ data: { ...essay, revisions } });
  } catch (error) {
    console.error("[Essay API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch essay" },
      { status: 500 },
    );
  }
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
    const parsed = UpdateEssaySchema.safeParse(body);
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.content !== undefined)
      updateData.content = parsed.data.content;
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.status !== undefined)
      updateData.status = parsed.data.status;
    if (parsed.data.wordCount !== undefined)
      updateData.wordCount = parsed.data.wordCount;

    const [updated] = await db
      .update(essays)
      .set(updateData)
      .where(and(eq(essays.id, id), eq(essays.studentId, student.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[Essay API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update essay" },
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

    const [student] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Revisions cascade from the essay row (essay_revisions.essay_id is
    // ON DELETE CASCADE). Deleting them separately ran before the ownership
    // check below, so any signed-in student could wipe another student's
    // revision history by essay id — and this connection bypasses RLS.
    const [deleted] = await db
      .delete(essays)
      .where(and(eq(essays.id, id), eq(essays.studentId, student.id)))
      .returning({ id: essays.id });

    if (!deleted) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Essay API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete essay" },
      { status: 500 },
    );
  }
}
