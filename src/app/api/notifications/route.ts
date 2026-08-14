import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getNotifications,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
} from "@/lib/notifications/engine";

type NotificationType =
  | "deadline_warning"
  | "match_new"
  | "application_update"
  | "score_updated"
  | "nudge"
  | "system"
  | "achievement";

const VALID_TYPES: NotificationType[] = [
  "deadline_warning",
  "match_new",
  "application_update",
  "score_updated",
  "nudge",
  "system",
  "achievement",
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const typeParam = searchParams.get("type");
    const type =
      typeParam && VALID_TYPES.includes(typeParam as NotificationType)
        ? (typeParam as NotificationType)
        : undefined;

    const result = await getNotifications(authUser.id, { page, limit, type });

    return NextResponse.json({
      data: result.data,
      total: result.total,
      unreadCount: result.unreadCount,
      page: result.page,
    });
  } catch (error) {
    console.error("[Notifications API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.markAllRead === true) {
      await markAllAsRead(authUser.id);
      return NextResponse.json({ success: true });
    }

    if (
      Array.isArray(body.notificationIds) &&
      body.notificationIds.length > 0
    ) {
      const ids = body.notificationIds.filter(
        (id: unknown) => typeof id === "string" && id.length > 0,
      );

      if (ids.length === 0) {
        return NextResponse.json(
          { error: "No valid notification IDs provided" },
          { status: 400 },
        );
      }

      await markMultipleAsRead(ids, authUser.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      {
        error:
          "Invalid request body. Provide { notificationIds: string[] } or { markAllRead: true }",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Notifications API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 },
    );
  }
}
