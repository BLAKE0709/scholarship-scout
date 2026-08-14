import Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions, plans, analyticsEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/engine";

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event);
      break;
    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event);
      break;
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
): Promise<void> {
  const session = event.data.object;

  const userId = session.metadata?.userId;
  const planSlug = session.metadata?.planSlug;

  if (!userId || !planSlug) {
    console.error(
      "[Stripe Webhook] checkout.session.completed missing metadata",
      { userId, planSlug },
    );
    return;
  }

  // Get the plan record
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, planSlug))
    .limit(1);

  if (!plan) {
    console.error(`[Stripe Webhook] Plan not found for slug: ${planSlug}`);
    return;
  }

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null);

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);

  // Fetch subscription details from Stripe if we have the ID
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  let status: "active" | "trialing" = "active";

  if (stripeSubscriptionId) {
    const stripeSub = await (
      await import("./client")
    ).stripe.subscriptions.retrieve(stripeSubscriptionId);

    // In Stripe v20+ (Clover API), current_period_start/end live on subscription items
    const firstItem = stripeSub.items.data[0];
    if (firstItem) {
      periodStart = new Date(firstItem.current_period_start * 1000);
      periodEnd = new Date(firstItem.current_period_end * 1000);
    }

    if (stripeSub.status === "trialing") {
      status = "trialing";
    }
  }

  // Upsert subscription record
  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        planId: plan.id,
        stripeCustomerId,
        stripeSubscriptionId,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      planId: plan.id,
      stripeCustomerId,
      stripeSubscriptionId,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });
  }

  // Send welcome notification
  await createNotification({
    userId,
    type: "system",
    title: "Welcome to Scholarship Scout!",
    body: `Your ${plan.name} subscription is now active. Start exploring scholarships tailored to your profile.`,
    actionUrl: "/dashboard",
    metadata: { planSlug, event: "subscription_created" },
  });

  // Log analytics event
  await db.insert(analyticsEvents).values({
    userId,
    eventType: "subscription_created",
    metadata: {
      planSlug,
      planName: plan.name,
      stripeSubscriptionId,
      status,
    },
  });
}

async function handleSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent,
): Promise<void> {
  const stripeSub = event.data.object;

  const stripeSubscriptionId = stripeSub.id;
  const stripeCustomerId =
    typeof stripeSub.customer === "string"
      ? stripeSub.customer
      : stripeSub.customer.id;

  // Find our subscription by stripe subscription ID
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (!sub) {
    console.error(
      `[Stripe Webhook] Subscription not found for stripe ID: ${stripeSubscriptionId}`,
    );
    return;
  }

  // Map Stripe status to our enum
  const statusMap: Record<
    string,
    "active" | "trialing" | "past_due" | "canceled" | "paused"
  > = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    paused: "paused",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    unpaid: "past_due",
  };

  const mappedStatus = statusMap[stripeSub.status] ?? "active";

  // In Stripe v20+ (Clover API), current_period_start/end live on subscription items
  const firstItem = stripeSub.items.data[0];
  const periodStart = firstItem
    ? new Date(firstItem.current_period_start * 1000)
    : null;
  const periodEnd = firstItem
    ? new Date(firstItem.current_period_end * 1000)
    : null;

  await db
    .update(subscriptions)
    .set({
      stripeCustomerId,
      status: mappedStatus,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));
}

async function handleSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent,
): Promise<void> {
  const stripeSub = event.data.object;
  const stripeSubscriptionId = stripeSub.id;

  // Find our subscription
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (!sub) {
    console.error(
      `[Stripe Webhook] Subscription not found for deleted stripe ID: ${stripeSubscriptionId}`,
    );
    return;
  }

  // Get the free plan to reset to
  const [freePlan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, "free"))
    .limit(1);

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      cancelAtPeriodEnd: false,
      planId: freePlan ? freePlan.id : sub.planId,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  // Notify user
  await createNotification({
    userId: sub.userId,
    type: "system",
    title: "Subscription Canceled",
    body: "Your subscription has been canceled. You have been moved to the free plan.",
    actionUrl: "/settings/billing",
    metadata: { event: "subscription_canceled" },
  });

  // Log analytics event
  await db.insert(analyticsEvents).values({
    userId: sub.userId,
    eventType: "subscription_canceled",
    metadata: {
      stripeSubscriptionId,
      previousPlanId: sub.planId,
    },
  });
}

async function handlePaymentFailed(
  event: Stripe.InvoicePaymentFailedEvent,
): Promise<void> {
  const invoice = event.data.object;

  const stripeCustomerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? null);

  if (!stripeCustomerId) {
    console.error("[Stripe Webhook] invoice.payment_failed missing customer");
    return;
  }

  // Find subscription by customer ID
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (!sub) {
    console.error(
      `[Stripe Webhook] Subscription not found for customer: ${stripeCustomerId}`,
    );
    return;
  }

  // Set status to past_due
  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  // Notify user
  await createNotification({
    userId: sub.userId,
    type: "system",
    title: "Payment Failed",
    body: "We were unable to process your payment. Please update your payment method to avoid service interruption.",
    actionUrl: "/settings/billing",
    metadata: { event: "payment_failed" },
  });
}

async function handlePaymentSucceeded(
  event: Stripe.InvoicePaymentSucceededEvent,
): Promise<void> {
  const invoice = event.data.object;

  const stripeCustomerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? null);

  if (!stripeCustomerId) {
    return;
  }

  // Find subscription by customer ID
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (!sub) {
    return;
  }

  // If was past_due, restore to active
  if (sub.status === "past_due") {
    await db
      .update(subscriptions)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    await createNotification({
      userId: sub.userId,
      type: "system",
      title: "Payment Successful",
      body: "Your payment has been processed successfully. Your subscription is now active again.",
      actionUrl: "/settings/billing",
      metadata: { event: "payment_recovered" },
    });
  }

  // Log analytics event
  await db.insert(analyticsEvents).values({
    userId: sub.userId,
    eventType: "payment_succeeded",
    metadata: {
      stripeCustomerId,
      invoiceId: invoice.id,
      amountPaid: invoice.amount_paid,
    },
  });
}
