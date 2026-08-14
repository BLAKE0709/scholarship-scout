import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe/client";
import { createNotification } from "@/lib/notifications/engine";
import { format } from "date-fns";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  if (!subscription) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 404 },
    );
  }

  if (!subscription.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No active Stripe subscription" },
      { status: 400 },
    );
  }

  if (subscription.cancelAtPeriodEnd) {
    return NextResponse.json(
      { error: "Subscription is already set to cancel" },
      { status: 400 },
    );
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  const endDate = subscription.currentPeriodEnd
    ? format(subscription.currentPeriodEnd, "MMMM d, yyyy")
    : "the end of your billing period";

  await createNotification({
    userId: user.id,
    type: "system",
    title: "Subscription Cancellation",
    body: `Your subscription will end on ${endDate}. You will continue to have access until then.`,
    actionUrl: "/settings/billing",
  });

  return NextResponse.json({
    success: true,
    endsAt: subscription.currentPeriodEnd?.toISOString() ?? null,
  });
}
