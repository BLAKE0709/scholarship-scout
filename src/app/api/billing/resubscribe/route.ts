import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe/client";

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
      { error: "No Stripe subscription found" },
      { status: 400 },
    );
  }

  if (!subscription.cancelAtPeriodEnd) {
    return NextResponse.json(
      { error: "Subscription is not set to cancel" },
      { status: 400 },
    );
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  return NextResponse.json({ success: true });
}
