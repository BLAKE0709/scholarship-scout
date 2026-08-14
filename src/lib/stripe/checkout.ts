import Stripe from "stripe";
import { stripe } from "./client";
import { db } from "@/lib/db";
import { plans, subscriptions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface CreateCheckoutSessionParams {
  userId: string;
  planSlug: string;
  interval: "month" | "year";
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<{ url: string }> {
  const { userId, planSlug, interval, successUrl, cancelUrl } = params;

  // Get the plan and its Stripe price ID
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, planSlug))
    .limit(1);

  if (!plan) {
    throw new Error(`Plan not found: ${planSlug}`);
  }

  const priceId =
    interval === "month" ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;

  if (!priceId) {
    throw new Error(
      `No Stripe price ID found for plan "${planSlug}" with interval "${interval}"`,
    );
  }

  // Get user email for Stripe customer
  const [user] = await db
    .select({ email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Check for existing Stripe customer ID
  const [existingSub] = await db
    .select({
      stripeCustomerId: subscriptions.stripeCustomerId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  let customerId: string | undefined;

  if (existingSub?.stripeCustomerId) {
    customerId = existingSub.stripeCustomerId;
  }

  // Determine if first-time subscriber (no previous subscription = eligible for trial)
  const hasHadSubscription = !!existingSub;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planSlug,
    },
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_email = user.email;
  }

  // 14-day free trial for first-time subscribers
  if (!hasHadSubscription) {
    sessionParams.subscription_data = {
      trial_period_days: 14,
      metadata: {
        userId,
        planSlug,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("Stripe checkout session created without a URL");
  }

  return { url: session.url };
}
