import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions, plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface BillingStatusResponse {
  plan: {
    name: string;
    slug: string;
    features: unknown;
  };
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
}

const FREE_PLAN_DEFAULTS: BillingStatusResponse = {
  plan: {
    name: "Free",
    slug: "free",
    features: {},
  },
  status: "active",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isTrial: false,
  trialEndsAt: null,
};

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Join subscriptions with plans
    const results = await db
      .select({
        subscriptionId: subscriptions.id,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        planName: plans.name,
        planSlug: plans.slug,
        planFeatures: plans.features,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.userId, authUser.id))
      .limit(1);

    const sub = results[0];

    if (!sub) {
      return NextResponse.json(FREE_PLAN_DEFAULTS);
    }

    const isTrial = sub.status === "trialing";
    const trialEndsAt =
      isTrial && sub.currentPeriodEnd
        ? sub.currentPeriodEnd.toISOString()
        : null;

    const response: BillingStatusResponse = {
      plan: {
        name: sub.planName,
        slug: sub.planSlug,
        features: sub.planFeatures,
      },
      status: sub.status ?? "active",
      currentPeriodEnd: sub.currentPeriodEnd
        ? sub.currentPeriodEnd.toISOString()
        : null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
      isTrial,
      trialEndsAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Billing Status API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing status" },
      { status: 500 },
    );
  }
}
