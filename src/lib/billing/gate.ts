import { db } from "@/lib/db";
import {
  subscriptions,
  plans,
  matches,
  essays,
  aiInteractions,
  studentProfiles,
} from "@/lib/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import {
  PLANS,
  type PlanFeatures,
  type PlanSlug,
  type PlanConfig,
} from "./plans";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  upgradeUrl?: string;
}

export interface UsageLimitResult {
  allowed: boolean;
  used: number;
  limit: number | null;
  resetAt: Date;
}

export interface UserPlanInfo {
  planSlug: PlanSlug;
  planName: string;
  features: PlanFeatures;
  status: string;
  isTrial: boolean;
  currentPeriodEnd: Date | null;
}

// ── Past-due grace period: 3 days ────────────────────────────────────────────

const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

// ── Core Functions ───────────────────────────────────────────────────────────

export async function getUserPlan(userId: string): Promise<UserPlanInfo> {
  const result = await db
    .select({
      planSlug: plans.slug,
      planName: plans.name,
      status: subscriptions.status,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  // No subscription = free plan
  if (result.length === 0) {
    return {
      planSlug: "free",
      planName: "Free",
      features: PLANS.free.features,
      status: "active",
      isTrial: false,
      currentPeriodEnd: null,
    };
  }

  const sub = result[0];
  const slug = sub.planSlug as PlanSlug;
  const planConfig: PlanConfig | undefined = PLANS[slug];
  const status = sub.status ?? "active";

  // Expired trial = free
  if (
    status === "trialing" &&
    sub.currentPeriodEnd &&
    new Date(sub.currentPeriodEnd) < new Date()
  ) {
    return {
      planSlug: "free",
      planName: "Free",
      features: PLANS.free.features,
      status: "canceled",
      isTrial: false,
      currentPeriodEnd: null,
    };
  }

  // Canceled subscription = free
  if (status === "canceled") {
    return {
      planSlug: "free",
      planName: "Free",
      features: PLANS.free.features,
      status: "canceled",
      isTrial: false,
      currentPeriodEnd: null,
    };
  }

  // Past due: keep features for 3-day grace period
  if (status === "past_due") {
    const updatedAt = sub.updatedAt ? new Date(sub.updatedAt).getTime() : 0;
    const now = Date.now();
    const withinGrace = now - updatedAt < PAST_DUE_GRACE_MS;

    return {
      planSlug: withinGrace ? slug : "free",
      planName: withinGrace ? (planConfig?.name ?? "Free") : "Free",
      features: withinGrace
        ? (planConfig?.features ?? PLANS.free.features)
        : PLANS.free.features,
      status: "past_due",
      isTrial: false,
      currentPeriodEnd: sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd)
        : null,
    };
  }

  return {
    planSlug: slug,
    planName: planConfig?.name ?? slug,
    features: planConfig?.features ?? PLANS.free.features,
    status,
    isTrial: status === "trialing",
    currentPeriodEnd: sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd)
      : null,
  };
}

export async function checkFeatureAccess(
  userId: string,
  feature: keyof PlanFeatures,
): Promise<FeatureAccessResult> {
  const userPlan = await getUserPlan(userId);
  const value = userPlan.features[feature];

  // Boolean features
  if (typeof value === "boolean") {
    if (value) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `${feature} is available on the Pro plan and above.`,
      upgradeUrl: "/pricing",
    };
  }

  // Numeric features with null = unlimited
  if (value === null || value === Infinity) {
    return { allowed: true };
  }

  // Numeric features with a limit — the limit itself is available,
  // actual usage is checked via checkUsageLimit
  if (typeof value === "number" && value > 0) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `This feature requires an upgrade.`,
    upgradeUrl: "/pricing",
  };
}

export async function checkUsageLimit(
  userId: string,
  limitType: "matches" | "essays" | "ai_calls",
): Promise<UsageLimitResult> {
  const userPlan = await getUserPlan(userId);
  const now = new Date();

  // Determine period start for usage counting
  let periodStart: Date;
  if (userPlan.currentPeriodEnd) {
    // Paid user: use billing period. Approximate period start as 30 days before period end
    const periodEnd = new Date(userPlan.currentPeriodEnd);
    periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (periodStart > now) {
      // Safety: if the computed start is in the future, use beginning of current month
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  } else {
    // Free user: calendar month
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Determine reset date
  const resetAt = userPlan.currentPeriodEnd
    ? new Date(userPlan.currentPeriodEnd)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Get student profile ID for this user (matches/essays use studentId, not userId)
  const studentProfile = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId))
    .limit(1);

  const studentId = studentProfile[0]?.id;

  if (limitType === "matches") {
    const limit = userPlan.features.matchLimitMonthly;
    if (limit === null) {
      return { allowed: true, used: 0, limit: null, resetAt };
    }
    if (!studentId) {
      return { allowed: true, used: 0, limit, resetAt };
    }

    const result = await db
      .select({ total: count() })
      .from(matches)
      .where(
        and(
          eq(matches.studentId, studentId),
          gte(matches.createdAt, periodStart),
        ),
      );

    const used = result[0]?.total ?? 0;
    return { allowed: used < limit, used, limit, resetAt };
  }

  if (limitType === "essays") {
    const limit = userPlan.features.essayLimitMonthly;
    if (limit === null) {
      return { allowed: true, used: 0, limit: null, resetAt };
    }
    if (!studentId) {
      return { allowed: true, used: 0, limit, resetAt };
    }

    const result = await db
      .select({ total: count() })
      .from(essays)
      .where(
        and(
          eq(essays.studentId, studentId),
          gte(essays.createdAt, periodStart),
        ),
      );

    const used = result[0]?.total ?? 0;
    return { allowed: used < limit, used, limit, resetAt };
  }

  // ai_calls: count in the last hour
  if (limitType === "ai_calls") {
    const limit = userPlan.features.aiCallsPerHour;
    if (limit === Infinity) {
      return {
        allowed: true,
        used: 0,
        limit: null,
        resetAt: new Date(now.getTime() + 3_600_000),
      };
    }
    if (!studentId) {
      return {
        allowed: true,
        used: 0,
        limit,
        resetAt: new Date(now.getTime() + 3_600_000),
      };
    }

    const oneHourAgo = new Date(now.getTime() - 3_600_000);
    const result = await db
      .select({ total: count() })
      .from(aiInteractions)
      .where(
        and(
          eq(aiInteractions.studentId, studentId),
          gte(aiInteractions.createdAt, oneHourAgo),
        ),
      );

    const used = result[0]?.total ?? 0;
    return {
      allowed: used < limit,
      used,
      limit,
      resetAt: new Date(now.getTime() + 3_600_000),
    };
  }

  // Should never reach here, but TypeScript exhaustiveness
  return { allowed: false, used: 0, limit: 0, resetAt };
}
