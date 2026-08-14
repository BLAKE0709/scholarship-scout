import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";

const VALID_PLAN_SLUGS = ["pro", "family"] as const;
const VALID_INTERVALS = ["month", "year"] as const;

type PlanSlug = (typeof VALID_PLAN_SLUGS)[number];
type Interval = (typeof VALID_INTERVALS)[number];

function isValidPlanSlug(value: string): value is PlanSlug {
  return (VALID_PLAN_SLUGS as readonly string[]).includes(value);
}

function isValidInterval(value: string): value is Interval {
  return (VALID_INTERVALS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planSlug, interval } = body as {
      planSlug: string;
      interval: string;
    };

    if (!planSlug || !isValidPlanSlug(planSlug)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'pro' or 'family'." },
        { status: 400 },
      );
    }

    if (!interval || !isValidInterval(interval)) {
      return NextResponse.json(
        { error: "Invalid interval. Must be 'month' or 'year'." },
        { status: 400 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const result = await createCheckoutSession({
      userId: authUser.id,
      planSlug,
      interval,
      successUrl: `${appUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/pricing`,
    });

    return NextResponse.json({ url: result.url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";
    console.error("[Billing Checkout API] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
