import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { eq, and, count, desc } from "drizzle-orm";

type NotificationType =
  | "deadline_warning"
  | "match_new"
  | "application_update"
  | "score_updated"
  | "nudge"
  | "system"
  | "achievement";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const [data] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      actionUrl: params.actionUrl ?? null,
      metadata: params.metadata ?? {},
      read: false,
      emailed: false,
    })
    .returning();

  return data;
}

export async function createNotificationBatch(
  items: CreateNotificationParams[],
) {
  if (items.length === 0) return [];

  const values = items.map((params) => ({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    actionUrl: params.actionUrl ?? null,
    metadata: params.metadata ?? {},
    read: false,
    emailed: false,
  }));

  const data = await db.insert(notifications).values(values).returning();
  return data;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false)),
    );

  return result?.value ?? 0;
}

export async function getNotifications(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    type?: NotificationType;
  } = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = [eq(notifications.userId, userId)];
  if (options.type) {
    conditions.push(eq(notifications.type, options.type));
  }

  const whereClause = and(...conditions);

  const [totalResult] = await db
    .select({ value: count() })
    .from(notifications)
    .where(whereClause);

  const total = totalResult?.value ?? 0;

  const [unreadResult] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false)),
    );

  const unreadCount = unreadResult?.value ?? 0;

  const data = await db
    .select()
    .from(notifications)
    .where(whereClause)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  return { data, total, unreadCount, page };
}

export async function markAsRead(notificationId: string, userId: string) {
  const [updated] = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    )
    .returning();

  return updated;
}

export async function markMultipleAsRead(
  notificationIds: string[],
  userId: string,
) {
  if (notificationIds.length === 0) return;

  for (const id of notificationIds) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false)),
    );
}

export async function getRecentNotifications(
  userId: string,
  limit: number = 10,
) {
  const data = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return data;
}

export async function getUserIdFromAuthId(
  authId: string,
): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, authId))
    .limit(1);

  return user?.id ?? null;
}
