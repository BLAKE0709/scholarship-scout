import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  applications,
  scholarships,
  essays,
  documents,
  studentProfiles,
  users,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { updateApplicationSchema } from "@/lib/validators/application";

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

    // Fetch application with scholarship data
    const [application] = await db
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
        scholarshipDescription: scholarships.description,
        amountMin: scholarships.amountMin,
        amountMax: scholarships.amountMax,
        deadline: scholarships.deadline,
        requirements: scholarships.requirements,
        applicationUrl: scholarships.applicationUrl,
      })
      .from(applications)
      .innerJoin(scholarships, eq(applications.scholarshipId, scholarships.id))
      .where(
        and(eq(applications.id, id), eq(applications.studentId, student.id)),
      )
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    // Fetch linked essays
    const linkedEssays = await db
      .select()
      .from(essays)
      .where(eq(essays.applicationId, id))
      .orderBy(desc(essays.updatedAt));

    // Fetch linked documents
    const linkedDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.studentId, student.id))
      .orderBy(desc(documents.uploadedAt));

    // Fetch unlinked essays for this student (for linking)
    const unlinkedEssays = await db
      .select({
        id: essays.id,
        title: essays.title,
        status: essays.status,
        wordCount: essays.wordCount,
        updatedAt: essays.updatedAt,
      })
      .from(essays)
      .where(
        and(
          eq(essays.studentId, student.id),
          eq(essays.applicationId, "00000000-0000-0000-0000-000000000000"),
        ),
      )
      .orderBy(desc(essays.updatedAt));

    // Actually, null check for applicationId requires IS NULL which needs different approach
    // Fetch all student essays and filter in JS
    const allStudentEssays = await db
      .select({
        id: essays.id,
        title: essays.title,
        status: essays.status,
        wordCount: essays.wordCount,
        applicationId: essays.applicationId,
        updatedAt: essays.updatedAt,
      })
      .from(essays)
      .where(eq(essays.studentId, student.id))
      .orderBy(desc(essays.updatedAt));

    const availableEssays = allStudentEssays.filter(
      (e) => e.applicationId === null,
    );

    return NextResponse.json({
      data: {
        ...application,
        essays: linkedEssays,
        documents: linkedDocuments,
        availableEssays,
      },
    });
  } catch (error) {
    console.error("[Application API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
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
    const parsed = updateApplicationSchema.safeParse(body);
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

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
      // Set submittedAt when transitioning to submitted
      if (parsed.data.status === "submitted") {
        updateData.submittedAt = new Date();
      }
    }

    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes;
    }

    const [updated] = await db
      .update(applications)
      .set(updateData)
      .where(
        and(eq(applications.id, id), eq(applications.studentId, student.id)),
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[Application API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
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

    // Soft delete: set status to withdrawn
    const [updated] = await db
      .update(applications)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(
        and(eq(applications.id, id), eq(applications.studentId, student.id)),
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Application API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 },
    );
  }
}
