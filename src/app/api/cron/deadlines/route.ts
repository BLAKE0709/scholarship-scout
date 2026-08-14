import { NextRequest, NextResponse } from "next/server";
import { checkDeadlineWarnings } from "@/lib/notifications/scheduler";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error(
        "[Cron Deadlines] CRON_SECRET environment variable not configured",
      );
      return NextResponse.json(
        { error: "Cron not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const processed = await checkDeadlineWarnings();

    console.log(
      `[Cron Deadlines] Processed ${processed} deadline warning(s) at ${new Date().toISOString()}`,
    );

    return NextResponse.json({
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron Deadlines] Error:", error);
    return NextResponse.json(
      { error: "Failed to process deadline warnings" },
      { status: 500 },
    );
  }
}
