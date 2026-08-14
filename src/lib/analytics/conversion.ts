import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";

export type ConversionEvent =
  | "pricing_page_viewed"
  | "checkout_started"
  | "checkout_completed"
  | "trial_started"
  | "trial_converted"
  | "trial_expired"
  | "subscription_canceled"
  | "upgrade_nudge_shown"
  | "upgrade_nudge_clicked";

export async function trackConversionEvent(
  userId: string,
  event: ConversionEvent,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(analyticsEvents).values({
    userId,
    eventType: `conversion:${event}`,
    metadata: metadata ?? {},
  });
}
