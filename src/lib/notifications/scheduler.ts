import { db } from "@/lib/db";
import {
  matches,
  scholarships,
  applications,
  notifications,
  studentProfiles,
  users,
  essays,
  fidelityScores,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc, ne, count, isNull } from "drizzle-orm";
import { createNotification } from "./engine";

/**
 * Check for scholarships with upcoming deadlines and notify students
 * who have been matched but haven't applied yet.
 *
 * Warns at 7, 3, and 1 day(s) before deadline.
 */
export async function checkDeadlineWarnings(): Promise<number> {
  const now = new Date();
  const warningDays = [7, 3, 1];
  let processed = 0;

  for (const daysOut of warningDays) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysOut);

    // Set to start/end of that day
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Find all active matches where the scholarship deadline falls on the target day
    const matchesWithDeadlines = await db
      .select({
        matchId: matches.id,
        studentId: matches.studentId,
        scholarshipId: matches.scholarshipId,
        scholarshipName: scholarships.name,
        deadline: scholarships.deadline,
        userId: users.id,
      })
      .from(matches)
      .innerJoin(scholarships, eq(matches.scholarshipId, scholarships.id))
      .innerJoin(studentProfiles, eq(matches.studentId, studentProfiles.id))
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(
        and(
          gte(scholarships.deadline, dayStart),
          lte(scholarships.deadline, dayEnd),
          eq(scholarships.status, "active"),
          ne(matches.status, "dismissed"),
        ),
      );

    for (const match of matchesWithDeadlines) {
      // Check if student already has an application for this scholarship
      const [existingApp] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.studentId, match.studentId),
            eq(applications.scholarshipId, match.scholarshipId),
          ),
        )
        .limit(1);

      if (existingApp) continue;

      // Check if this exact warning was already sent (prevent duplicates)
      const metadataCheck = {
        scholarshipId: match.scholarshipId,
        daysOut: daysOut,
      };

      const [existingNotification] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, match.userId),
            eq(notifications.type, "deadline_warning"),
            sql`${notifications.metadata}->>'scholarshipId' = ${match.scholarshipId}`,
            sql`(${notifications.metadata}->>'daysOut')::int = ${daysOut}`,
          ),
        )
        .limit(1);

      if (existingNotification) continue;

      const urgencyLabel =
        daysOut === 1 ? "TOMORROW" : daysOut === 3 ? "in 3 days" : "in 1 week";

      await createNotification({
        userId: match.userId,
        type: "deadline_warning",
        title: `Deadline ${urgencyLabel}: ${match.scholarshipName}`,
        body: `The deadline for "${match.scholarshipName}" is ${urgencyLabel}. You matched with this scholarship but haven't applied yet. Don't miss out!`,
        actionUrl: `/scholarships?matchId=${match.matchId}`,
        metadata: metadataCheck,
      });

      processed++;
    }
  }

  return processed;
}

/**
 * Generate a weekly digest notification for a student.
 * Summarizes new matches, upcoming deadlines, and application changes
 * from the past 7 days.
 */
export async function sendWeeklyDigest(userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get student profile
  const [student] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!student) return false;

  // Count new matches in last 7 days
  const [newMatchesResult] = await db
    .select({ value: count() })
    .from(matches)
    .where(
      and(
        eq(matches.studentId, student.id),
        gte(matches.createdAt, sevenDaysAgo),
      ),
    );
  const newMatchCount = newMatchesResult?.value ?? 0;

  // Count upcoming deadlines (next 14 days)
  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
  const now = new Date();

  const upcomingDeadlines = await db
    .select({
      name: scholarships.name,
      deadline: scholarships.deadline,
    })
    .from(matches)
    .innerJoin(scholarships, eq(matches.scholarshipId, scholarships.id))
    .where(
      and(
        eq(matches.studentId, student.id),
        gte(scholarships.deadline, now),
        lte(scholarships.deadline, twoWeeksOut),
        eq(scholarships.status, "active"),
        ne(matches.status, "dismissed"),
      ),
    )
    .orderBy(scholarships.deadline)
    .limit(5);

  // Count application status changes
  const [appChangesResult] = await db
    .select({ value: count() })
    .from(applications)
    .where(
      and(
        eq(applications.studentId, student.id),
        gte(applications.updatedAt, sevenDaysAgo),
      ),
    );
  const appChanges = appChangesResult?.value ?? 0;

  // Only send digest if there's something to report
  if (
    newMatchCount === 0 &&
    upcomingDeadlines.length === 0 &&
    appChanges === 0
  ) {
    return false;
  }

  const bodyParts: string[] = [];

  if (newMatchCount > 0) {
    bodyParts.push(
      `${newMatchCount} new scholarship match${newMatchCount > 1 ? "es" : ""} found`,
    );
  }

  if (upcomingDeadlines.length > 0) {
    const deadlineNames = upcomingDeadlines
      .map((d) => d.name)
      .slice(0, 3)
      .join(", ");
    const extra =
      upcomingDeadlines.length > 3
        ? ` and ${upcomingDeadlines.length - 3} more`
        : "";
    bodyParts.push(`Upcoming deadlines: ${deadlineNames}${extra}`);
  }

  if (appChanges > 0) {
    bodyParts.push(
      `${appChanges} application${appChanges > 1 ? "s" : ""} updated`,
    );
  }

  await createNotification({
    userId,
    type: "system",
    title: "Your Weekly Scholarship Digest",
    body: bodyParts.join(". ") + ".",
    actionUrl: "/dashboard",
    metadata: {
      type: "weekly_digest",
      periodStart: sevenDaysAgo.toISOString(),
      periodEnd: new Date().toISOString(),
      newMatches: newMatchCount,
      upcomingDeadlines: upcomingDeadlines.length,
      appChanges,
    },
  });

  return true;
}

/**
 * Check for students who haven't been active recently and send nudges.
 * Triggered if no application activity in 14 days and they have unviewed matches.
 */
export async function sendInactivityNudges(): Promise<number> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  let processed = 0;

  // Find students with new/unviewed matches but no recent application activity
  const studentsWithStaleMatches = await db
    .select({
      studentId: studentProfiles.id,
      userId: users.id,
      fullName: users.fullName,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(users.role, "student"));

  for (const student of studentsWithStaleMatches) {
    // Check if they have new matches
    const [newMatchCount] = await db
      .select({ value: count() })
      .from(matches)
      .where(
        and(
          eq(matches.studentId, student.studentId),
          eq(matches.status, "new"),
        ),
      );

    if (!newMatchCount || newMatchCount.value === 0) continue;

    // Check if they have recent application activity
    const [recentActivity] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.studentId, student.studentId),
          gte(applications.updatedAt, fourteenDaysAgo),
        ),
      )
      .limit(1);

    if (recentActivity) continue;

    // Check if we already sent a nudge in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentNudge] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, student.userId),
          eq(notifications.type, "nudge"),
          gte(notifications.createdAt, sevenDaysAgo),
        ),
      )
      .limit(1);

    if (recentNudge) continue;

    const firstName = student.fullName?.split(" ")[0] ?? "there";

    await createNotification({
      userId: student.userId,
      type: "nudge",
      title: `Hey ${firstName}, you have ${newMatchCount.value} scholarship matches waiting!`,
      body: `You have ${newMatchCount.value} unreviewed scholarship match${newMatchCount.value > 1 ? "es" : ""}. Take a few minutes to review them - your future self will thank you.`,
      actionUrl: "/scholarships",
      metadata: {
        type: "inactivity_nudge",
        unmatchedCount: newMatchCount.value,
      },
    });

    processed++;
  }

  return processed;
}
