import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { familyLinks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ id: string }>;
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
    const { action } = body as { action: "approve" | "reject" };

    if (!action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 },
      );
    }

    // Look up the link - only the student can approve/reject
    const [link] = await db
      .select()
      .from(familyLinks)
      .where(
        and(eq(familyLinks.id, id), eq(familyLinks.studentId, authUser.id)),
      )
      .limit(1);

    if (!link) {
      return NextResponse.json(
        { error: "Link request not found or you are not authorized" },
        { status: 404 },
      );
    }

    if (link.status !== "pending") {
      return NextResponse.json(
        { error: "This link request is no longer pending" },
        { status: 400 },
      );
    }

    if (action === "approve") {
      await db
        .update(familyLinks)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(familyLinks.id, id));

      return NextResponse.json({
        success: true,
        message: "Parent access approved",
      });
    } else {
      // Reject: delete the record
      await db.delete(familyLinks).where(eq(familyLinks.id, id));

      return NextResponse.json({
        success: true,
        message: "Link request declined",
      });
    }
  } catch (error) {
    console.error("[Family Link API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update link request" },
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

    // Either the parent or the student can unlink
    const [link] = await db
      .select()
      .from(familyLinks)
      .where(eq(familyLinks.id, id))
      .limit(1);

    if (!link) {
      return NextResponse.json(
        { error: "Family link not found" },
        { status: 404 },
      );
    }

    // Verify the requesting user is either the parent or student on this link
    if (link.parentId !== authUser.id && link.studentId !== authUser.id) {
      return NextResponse.json(
        { error: "You are not authorized to modify this link" },
        { status: 403 },
      );
    }

    // Set status to revoked
    await db
      .update(familyLinks)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(eq(familyLinks.id, id));

    return NextResponse.json({
      success: true,
      message: "Family link has been revoked",
    });
  } catch (error) {
    console.error("[Family Link API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to revoke family link" },
      { status: 500 },
    );
  }
}
