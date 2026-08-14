import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_MESSAGES: Record<string, string> = {
  deadline: "You have a scholarship deadline approaching! Don't miss out.",
  inactive: "We haven't seen you in a while. Your scholarships are waiting!",
  incomplete: "Complete your profile to unlock better scholarship matches.",
};

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
      .select("id, role, full_name")
      .eq("id", authUser.id)
      .single();

    if (!userRecord || userRecord.role !== "counselor") {
      return NextResponse.json(
        { error: "Forbidden: counselor role required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { studentId, nudgeType, message } = body as {
      studentId?: string;
      nudgeType?: string;
      message?: string;
    };

    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 },
      );
    }

    const validTypes = ["deadline", "inactive", "incomplete"];
    if (!nudgeType || !validTypes.includes(nudgeType)) {
      return NextResponse.json(
        { error: `nudgeType must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    // Verify the student is linked to this counselor
    const { data: link } = await supabase
      .from("counselor_students")
      .select("id")
      .eq("counselor_id", authUser.id)
      .eq("student_id", studentId)
      .single();

    if (!link) {
      return NextResponse.json(
        { error: "Student not linked to this counselor" },
        { status: 403 },
      );
    }

    // Rate limit: max 3 nudges per student per week
    const oneWeekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: recentNudges, count: nudgeCount } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact" })
      .eq("user_id", authUser.id)
      .eq("event_type", "counselor_nudge")
      .gte("created_at", oneWeekAgo)
      .filter("metadata->>student_id", "eq", studentId);

    if ((nudgeCount ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Rate limit: maximum 3 nudges per student per week" },
        { status: 429 },
      );
    }

    const nudgeMessage =
      message?.trim() ||
      DEFAULT_MESSAGES[nudgeType] ||
      DEFAULT_MESSAGES.inactive;
    const counselorName = userRecord.full_name ?? "Your counselor";

    // Create notification for the student
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: studentId,
      type: "nudge",
      title: `Nudge from ${counselorName}`,
      body: nudgeMessage,
      action_url: "/dashboard",
      metadata: {
        counselor_id: authUser.id,
        nudge_type: nudgeType,
      },
      read: false,
      emailed: false,
    });

    if (notifError) {
      console.error("[Nudge API] notification insert error:", notifError);
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 },
      );
    }

    // Log in analytics_events
    const { error: analyticsError } = await supabase
      .from("analytics_events")
      .insert({
        user_id: authUser.id,
        event_type: "counselor_nudge",
        metadata: {
          student_id: studentId,
          nudge_type: nudgeType,
          message: nudgeMessage,
        },
      });

    if (analyticsError) {
      console.error("[Nudge API] analytics insert error:", analyticsError);
      // Non-fatal: notification was already sent
    }

    return NextResponse.json({ success: true, message: "Nudge sent" });
  } catch (error) {
    console.error("[Nudge API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to send nudge" },
      { status: 500 },
    );
  }
}
