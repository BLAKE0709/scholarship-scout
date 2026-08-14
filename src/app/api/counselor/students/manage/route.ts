import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { email, emails } = body as { email?: string; emails?: string[] };

    // Normalize to array
    const emailList: string[] = [];
    if (emails && Array.isArray(emails)) {
      for (const e of emails) {
        const trimmed = e.trim().toLowerCase();
        if (trimmed) emailList.push(trimmed);
      }
    } else if (email && typeof email === "string") {
      const trimmed = email.trim().toLowerCase();
      if (trimmed) emailList.push(trimmed);
    }

    if (emailList.length === 0) {
      return NextResponse.json(
        { error: "At least one email is required" },
        { status: 400 },
      );
    }

    if (emailList.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 emails per request" },
        { status: 400 },
      );
    }

    const results: Array<{ email: string; success: boolean; error?: string }> =
      [];

    for (const targetEmail of emailList) {
      // Look up user by email
      const { data: targetUser } = await supabase
        .from("users")
        .select("id, role, full_name")
        .eq("email", targetEmail)
        .single();

      if (!targetUser) {
        results.push({
          email: targetEmail,
          success: false,
          error: "User not found",
        });
        continue;
      }

      if (targetUser.role !== "student") {
        results.push({
          email: targetEmail,
          success: false,
          error: "User is not a student",
        });
        continue;
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from("counselor_students")
        .select("id")
        .eq("counselor_id", authUser.id)
        .eq("student_id", targetUser.id)
        .single();

      if (existingLink) {
        results.push({
          email: targetEmail,
          success: false,
          error: "Student already linked",
        });
        continue;
      }

      // Create link
      const { error: insertError } = await supabase
        .from("counselor_students")
        .insert({
          counselor_id: authUser.id,
          student_id: targetUser.id,
        });

      if (insertError) {
        console.error("[Manage Students] insert error:", insertError);
        results.push({
          email: targetEmail,
          success: false,
          error: "Failed to create link",
        });
        continue;
      }

      // Send notification to the student
      await supabase.from("notifications").insert({
        user_id: targetUser.id,
        type: "system",
        title: "Counselor Connected",
        body: `A counselor has added you to their student roster.`,
        action_url: "/dashboard",
        metadata: { counselor_id: authUser.id },
        read: false,
        emailed: false,
      });

      results.push({ email: targetEmail, success: true });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error("[Manage Students] POST error:", error);
    return NextResponse.json(
      { error: "Failed to add students" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { studentId } = body as { studentId?: string };

    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 },
      );
    }

    // Verify the link exists
    const { data: existingLink } = await supabase
      .from("counselor_students")
      .select("id")
      .eq("counselor_id", authUser.id)
      .eq("student_id", studentId)
      .single();

    if (!existingLink) {
      return NextResponse.json(
        { error: "Student link not found" },
        { status: 404 },
      );
    }

    // Delete the link
    const { error: deleteError } = await supabase
      .from("counselor_students")
      .delete()
      .eq("counselor_id", authUser.id)
      .eq("student_id", studentId);

    if (deleteError) {
      console.error("[Manage Students] delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove student" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "Student removed" });
  } catch (error) {
    console.error("[Manage Students] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove student" },
      { status: 500 },
    );
  }
}
