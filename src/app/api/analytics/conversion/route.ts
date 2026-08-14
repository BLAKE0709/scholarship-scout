import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  trackConversionEvent,
  type ConversionEvent,
} from "@/lib/analytics/conversion";

const VALID_EVENTS: ConversionEvent[] = [
  "pricing_page_viewed",
  "checkout_started",
  "checkout_completed",
  "trial_started",
  "trial_converted",
  "trial_expired",
  "subscription_canceled",
  "upgrade_nudge_shown",
  "upgrade_nudge_clicked",
];

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

    if (!body.event || !VALID_EVENTS.includes(body.event as ConversionEvent)) {
      return NextResponse.json(
        { error: "Invalid or missing event type" },
        { status: 400 },
      );
    }

    const metadata =
      body.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : undefined;

    await trackConversionEvent(
      authUser.id,
      body.event as ConversionEvent,
      metadata,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Analytics Conversion] POST error:", error);
    return NextResponse.json(
      { error: "Failed to track conversion event" },
      { status: 500 },
    );
  }
}
