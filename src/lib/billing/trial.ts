import { db } from "@/lib/db";
import { subscriptions, plans } from "@/lib/db/schema";
import { eq, and, lt, isNull } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/engine";
import { trackConversionEvent } from "@/lib/analytics/conversion";

interface TrialStatus {
  isTrial: boolean;
  daysRemaining: number;
  expiresAt: Date | null;
  planSlug: string | null;
}

export async function startTrial(
  userId: string,
  planSlug: string,
): Promise<void> {
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, planSlug))
    .limit(1);

  if (!plan) {
    throw new Error(`Plan not found: ${planSlug}`);
  }

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14);

  await db.insert(subscriptions).values({
    userId,
    planId: plan.id,
    status: "trialing",
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    cancelAtPeriodEnd: false,
  });

  await trackConversionEvent(userId, "trial_started", {
    planSlug,
    planId: plan.id,
    trialEndDate: trialEnd.toISOString(),
  });
}

export async function checkTrialStatus(userId: string): Promise<TrialStatus> {
  const result = await db
    .select({
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      planSlug: plans.slug,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "trialing"),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    return {
      isTrial: false,
      daysRemaining: 0,
      expiresAt: null,
      planSlug: null,
    };
  }

  const sub = result[0];
  const now = new Date();
  const expiresAt = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd)
    : null;

  if (!expiresAt) {
    return {
      isTrial: false,
      daysRemaining: 0,
      expiresAt: null,
      planSlug: sub.planSlug,
    };
  }

  // Trial expired and no payment method attached
  if (expiresAt <= now && !sub.stripeSubscriptionId) {
    return {
      isTrial: false,
      daysRemaining: 0,
      expiresAt,
      planSlug: sub.planSlug,
    };
  }

  const msRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(
    0,
    Math.ceil(msRemaining / (1000 * 60 * 60 * 24)),
  );

  return {
    isTrial: true,
    daysRemaining,
    expiresAt,
    planSlug: sub.planSlug,
  };
}

export async function handleTrialExpiry(): Promise<{ processed: number }> {
  const now = new Date();

  const expiredTrials = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      planSlug: plans.slug,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.status, "trialing"),
        lt(subscriptions.currentPeriodEnd, now),
        isNull(subscriptions.stripeSubscriptionId),
      ),
    );

  for (const trial of expiredTrials) {
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        updatedAt: now,
      })
      .where(eq(subscriptions.id, trial.id));

    await createNotification({
      userId: trial.userId,
      type: "nudge",
      title: "Your Pro trial has ended",
      body: "Your 14-day Pro trial has expired. Subscribe now to keep unlimited matches, essays, and your Fidelity Score. Your data is safe and waiting for you.",
      actionUrl: "/pricing",
      metadata: {
        trialExpired: true,
        planSlug: trial.planSlug,
      },
    });

    await trackConversionEvent(trial.userId, "trial_expired", {
      planSlug: trial.planSlug,
    });
  }

  return { processed: expiredTrials.length };
}
