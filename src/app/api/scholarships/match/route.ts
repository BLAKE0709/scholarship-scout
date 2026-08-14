import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  users,
  studentProfiles,
  matches,
  scholarships,
  scholarshipProviders,
} from "@/lib/db/schema";
import { eq, desc, asc, gte, lte, and, ne, sql } from "drizzle-orm";
import { generateMatchesForStudent } from "@/lib/scholarships/match-scheduler";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student profile
    const [student] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found. Complete onboarding first." },
        { status: 404 },
      );
    }

    const result = await generateMatchesForStudent(student.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ matchCount: result.matchCount });
  } catch (error) {
    console.error("[Match API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate matches" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const sortBy = url.searchParams.get("sort") ?? "best_match";
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? "50"),
      100,
    );
    const minScore = parseInt(url.searchParams.get("minScore") ?? "0");
    const tag = url.searchParams.get("tag");
    const offset = (page - 1) * limit;

    // Get student profile ID
    const [student] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!student) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // Build conditions
    const conditions = [
      eq(matches.studentId, student.id),
      ne(matches.status, "dismissed"),
    ];

    if (minScore > 0) {
      conditions.push(gte(matches.matchScore, minScore));
    }

    // Determine sort order
    let orderBy;
    switch (sortBy) {
      case "deadline":
        orderBy = asc(scholarships.deadline);
        break;
      case "amount":
        orderBy = desc(scholarships.amountMax);
        break;
      default:
        orderBy = desc(matches.matchScore);
    }

    // Query matches with scholarship data
    const results = await db
      .select({
        matchId: matches.id,
        matchScore: matches.matchScore,
        affinityScore: matches.affinityScore,
        matchReasons: matches.matchReasons,
        matchStatus: matches.status,
        scholarshipId: scholarships.id,
        scholarshipName: scholarships.name,
        description: scholarships.description,
        amountMin: scholarships.amountMin,
        amountMax: scholarships.amountMax,
        deadline: scholarships.deadline,
        tags: scholarships.tags,
        renewable: scholarships.renewable,
        national: scholarships.national,
        states: scholarships.states,
        eligibility: scholarships.eligibility,
        requirements: scholarships.requirements,
        providerName: scholarshipProviders.name,
      })
      .from(matches)
      .innerJoin(scholarships, eq(matches.scholarshipId, scholarships.id))
      .leftJoin(
        scholarshipProviders,
        eq(scholarships.providerId, scholarshipProviders.id),
      )
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Filter by tag in application layer (JSONB array filtering)
    let filtered = results;
    if (tag) {
      filtered = results.filter((r) => r.tags?.includes(tag));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(matches)
      .where(and(...conditions));

    return NextResponse.json({
      data: filtered,
      total: countResult?.count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("[Match API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 },
    );
  }
}
