import { NextRequest, NextResponse } from "next/server";
import { handleTrialExpiry } from "@/lib/billing/trial";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error(
        "[Cron Trials] CRON_SECRET environment variable not configured",
      );
      return NextResponse.json(
        { error: "Cron not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await handleTrialExpiry();

    console.log(
      `[Cron Trials] Processed ${result.processed} expired trial(s) at ${new Date().toISOString()}`,
    );

    return NextResponse.json({
      processed: result.processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron Trials] Error:", error);
    return NextResponse.json(
      { error: "Failed to process trial expirations" },
      { status: 500 },
    );
  }
}
