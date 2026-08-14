import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe/portal";

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await createPortalSession(authUser.id);

    return NextResponse.json({ url: result.url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create portal session";
    console.error("[Billing Portal API] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
