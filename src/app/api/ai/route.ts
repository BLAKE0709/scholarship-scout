import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, subscriptions, plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { aiGateway, AIGatewayError, isAIConfigured } from "@/lib/ai/gateway";
import { AIGatewayRequestSchema } from "@/lib/ai/types";
import type { UserTier } from "@/lib/ai/types";

/**
 * Availability probe so the editor can present an honest coach state up front
 * instead of offering buttons that fail. Reports only a boolean, never the key.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ configured: isAIConfigured() });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parsed = AIGatewayRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const gatewayRequest = parsed.data;

    // 3. Determine user tier from subscription
    const userTier = await getUserTier(authUser.id);

    // 4. Attach userId from auth if not provided
    if (!gatewayRequest.userId) {
      gatewayRequest.userId = authUser.id;
    }

    // 5. Call AI Gateway
    const response = await aiGateway.call(gatewayRequest, userTier);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AIGatewayError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    console.error("[AI Route] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}

async function getUserTier(authUserId: string): Promise<UserTier> {
  try {
    // Get user record
    const [userRecord] = await db
      .select({ role: users.role, id: users.id })
      .from(users)
      .where(eq(users.id, authUserId))
      .limit(1);

    if (!userRecord) return "free";

    // Admin and counselor roles get unlimited
    if (
      userRecord.role === "superadmin" ||
      userRecord.role === "institution_admin"
    ) {
      return "admin";
    }
    if (userRecord.role === "counselor") {
      return "counselor";
    }

    // Check subscription for students/parents
    const [sub] = await db
      .select({
        status: subscriptions.status,
        planSlug: plans.slug,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.userId, authUserId))
      .limit(1);

    if (sub && sub.status === "active" && sub.planSlug !== "free") {
      return "pro";
    }

    return "free";
  } catch {
    return "free";
  }
}
