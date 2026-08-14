import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  familyLinks,
  users,
  studentProfiles,
  applications,
  scholarships,
  matches,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ studentId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { studentId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the parent is linked to this student with an active link
    const [activeLink] = await db
      .select({ id: familyLinks.id })
      .from(familyLinks)
      .where(
        and(
          eq(familyLinks.parentId, authUser.id),
          eq(familyLinks.studentId, studentId),
          eq(familyLinks.status, "active"),
        ),
      )
      .limit(1);

    if (!activeLink) {
      return NextResponse.json(
        { error: "You do not have access to this student's data" },
        { status: 403 },
      );
    }

    // Fetch student user record (name, email - NOT essay/fidelity/AI data)
    const [studentUser] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    if (!studentUser) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Fetch student profile (school, grade, graduation year)
    const [profile] = await db
      .select({
        id: studentProfiles.id,
        schoolName: studentProfiles.schoolName,
        gradeLevel: studentProfiles.gradeLevel,
        graduationYear: studentProfiles.graduationYear,
        state: studentProfiles.state,
        city: studentProfiles.city,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, studentId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({
        data: {
          student: {
            id: studentUser.id,
            fullName: studentUser.fullName,
            avatarUrl: studentUser.avatarUrl,
            lastActive: studentUser.updatedAt,
          },
          profile: null,
          applications: [],
          upcomingDeadlines: [],
          stats: {
            totalApplications: 0,
            submitted: 0,
            inProgress: 0,
            drafts: 0,
            accepted: 0,
            totalValueApplied: 0,
            totalValueWon: 0,
          },
        },
      });
    }

    // Fetch applications with scholarship info (name, amount, deadline, status ONLY)
    // PRIVACY: No essay content, no revision history, no fidelity details, no AI interaction data
    const studentApps = await db
      .select({
        id: applications.id,
        status: applications.status,
        submittedAt: applications.submittedAt,
        updatedAt: applications.updatedAt,
        scholarshipName: scholarships.name,
        scholarshipAmountMin: scholarships.amountMin,
        scholarshipAmountMax: scholarships.amountMax,
        scholarshipDeadline: scholarships.deadline,
      })
      .from(applications)
      .innerJoin(scholarships, eq(applications.scholarshipId, scholarships.id))
      .where(eq(applications.studentId, profile.id))
      .orderBy(desc(applications.updatedAt));

    // Calculate stats
    const submitted = studentApps.filter(
      (a) =>
        a.status === "submitted" ||
        a.status === "under_review" ||
        a.status === "accepted" ||
        a.status === "rejected",
    ).length;
    const inProgress = studentApps.filter(
      (a) => a.status === "in_progress",
    ).length;
    const drafts = studentApps.filter((a) => a.status === "draft").length;
    const accepted = studentApps.filter((a) => a.status === "accepted");

    const totalValueApplied = studentApps
      .filter((a) => a.status !== "draft" && a.status !== "withdrawn")
      .reduce(
        (sum, a) => sum + (a.scholarshipAmountMax ?? a.scholarshipAmountMin),
        0,
      );

    const totalValueWon = accepted.reduce(
      (sum, a) => sum + (a.scholarshipAmountMax ?? a.scholarshipAmountMin),
      0,
    );

    // Fetch upcoming deadlines from matched scholarships
    const upcomingDeadlines = await db
      .select({
        matchId: matches.id,
        scholarshipName: scholarships.name,
        scholarshipDeadline: scholarships.deadline,
        scholarshipAmountMin: scholarships.amountMin,
        scholarshipAmountMax: scholarships.amountMax,
        matchScore: matches.matchScore,
        matchStatus: matches.status,
      })
      .from(matches)
      .innerJoin(scholarships, eq(matches.scholarshipId, scholarships.id))
      .where(eq(matches.studentId, profile.id))
      .orderBy(scholarships.deadline)
      .limit(10);

    // Filter to future deadlines only
    const now = new Date();
    const futureDeadlines = upcomingDeadlines.filter(
      (d) => d.scholarshipDeadline && new Date(d.scholarshipDeadline) > now,
    );

    // Get last activity timestamp (most recent application update)
    const lastActive =
      studentApps.length > 0 ? studentApps[0].updatedAt : studentUser.updatedAt;

    return NextResponse.json({
      data: {
        student: {
          id: studentUser.id,
          fullName: studentUser.fullName,
          avatarUrl: studentUser.avatarUrl,
          lastActive,
        },
        profile: {
          schoolName: profile.schoolName,
          gradeLevel: profile.gradeLevel,
          graduationYear: profile.graduationYear,
          state: profile.state,
          city: profile.city,
        },
        applications: studentApps.map((a) => ({
          id: a.id,
          status: a.status,
          submittedAt: a.submittedAt,
          scholarshipName: a.scholarshipName,
          amountMin: a.scholarshipAmountMin,
          amountMax: a.scholarshipAmountMax,
          deadline: a.scholarshipDeadline,
        })),
        upcomingDeadlines: futureDeadlines.map((d) => ({
          scholarshipName: d.scholarshipName,
          deadline: d.scholarshipDeadline,
          amountMin: d.scholarshipAmountMin,
          amountMax: d.scholarshipAmountMax,
          matchScore: d.matchScore,
        })),
        stats: {
          totalApplications: studentApps.length,
          submitted,
          inProgress,
          drafts,
          accepted: accepted.length,
          totalValueApplied,
          totalValueWon,
        },
      },
    });
  } catch (error) {
    console.error("[Family Students API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student data" },
      { status: 500 },
    );
  }
}
