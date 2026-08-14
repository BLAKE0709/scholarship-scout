import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkTrialStatus } from "@/lib/billing/trial";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await checkTrialStatus(authUser.id);

    return NextResponse.json({
      isTrial: status.isTrial,
      daysRemaining: status.daysRemaining,
      expiresAt: status.expiresAt?.toISOString() ?? null,
      planSlug: status.planSlug,
    });
  } catch (error) {
    console.error("[Billing Trial Status] GET error:", error);
    return NextResponse.json(
      { error: "Failed to check trial status" },
      { status: 500 },
    );
  }
}
