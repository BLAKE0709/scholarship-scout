import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { familyLinks, linkCodes, users } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the requesting user is a parent
    const [parentUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!parentUser || parentUser.role !== "parent") {
      return NextResponse.json(
        { error: "Only parent accounts can create family links" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { method, identifier } = body as {
      method: "email" | "code";
      identifier: string;
    };

    if (!method || !identifier) {
      return NextResponse.json(
        { error: "Method and identifier are required" },
        { status: 400 },
      );
    }

    if (method !== "email" && method !== "code") {
      return NextResponse.json(
        { error: "Method must be 'email' or 'code'" },
        { status: 400 },
      );
    }

    // Check the parent doesn't already have 5 active/pending links
    const existingLinks = await db
      .select({ id: familyLinks.id })
      .from(familyLinks)
      .where(
        and(
          eq(familyLinks.parentId, authUser.id),
          or(
            eq(familyLinks.status, "pending"),
            eq(familyLinks.status, "active"),
          ),
        ),
      );

    if (existingLinks.length >= 5) {
      return NextResponse.json(
        { error: "Maximum of 5 linked students allowed per parent account" },
        { status: 400 },
      );
    }

    let studentId: string;

    if (method === "code") {
      // Look up the link code
      const [codeRecord] = await db
        .select({
          id: linkCodes.id,
          studentId: linkCodes.studentId,
          expiresAt: linkCodes.expiresAt,
          used: linkCodes.used,
        })
        .from(linkCodes)
        .where(
          and(
            eq(linkCodes.code, identifier.toUpperCase().trim()),
            eq(linkCodes.used, false),
          ),
        )
        .limit(1);

      if (!codeRecord) {
        return NextResponse.json(
          { error: "Invalid or expired link code" },
          { status: 400 },
        );
      }

      // Check expiration
      if (codeRecord.expiresAt && new Date(codeRecord.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: "This link code has expired" },
          { status: 400 },
        );
      }

      studentId = codeRecord.studentId;

      // Mark the code as used
      await db
        .update(linkCodes)
        .set({ used: true })
        .where(eq(linkCodes.id, codeRecord.id));
    } else {
      // Email method: look up student by email
      const [studentUser] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, identifier.toLowerCase().trim()))
        .limit(1);

      if (!studentUser || studentUser.role !== "student") {
        return NextResponse.json(
          { error: "No student account found with that email address" },
          { status: 404 },
        );
      }

      studentId = studentUser.id;
    }

    // Prevent linking to self
    if (studentId === authUser.id) {
      return NextResponse.json(
        { error: "Cannot link to your own account" },
        { status: 400 },
      );
    }

    // Check for existing link between this parent and student
    const [existingLink] = await db
      .select({ id: familyLinks.id, status: familyLinks.status })
      .from(familyLinks)
      .where(
        and(
          eq(familyLinks.parentId, authUser.id),
          eq(familyLinks.studentId, studentId),
        ),
      )
      .limit(1);

    if (existingLink) {
      if (
        existingLink.status === "active" ||
        existingLink.status === "pending"
      ) {
        return NextResponse.json(
          {
            error:
              existingLink.status === "active"
                ? "You are already linked to this student"
                : "A pending link request already exists for this student",
          },
          { status: 409 },
        );
      }
      // If revoked, update to pending to re-request
      await db
        .update(familyLinks)
        .set({
          status: "pending",
          linkMethod: method,
          updatedAt: new Date(),
        })
        .where(eq(familyLinks.id, existingLink.id));

      return NextResponse.json({
        success: true,
        message: "Link request sent. The student will need to approve it.",
      });
    }

    // Create the family link with pending status
    await db.insert(familyLinks).values({
      parentId: authUser.id,
      studentId,
      status: "pending",
      linkMethod: method,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Link request sent. The student will need to approve it.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Family Link API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create family link" },
      { status: 500 },
    );
  }
}
