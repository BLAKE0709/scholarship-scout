"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  Target,
  FileText,
  Shield,
  MessageSquare,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
}

const TYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  system: Bell,
  deadline_warning: Calendar,
  match_new: Target,
  application_update: FileText,
  score_updated: Shield,
  nudge: MessageSquare,
  achievement: Award,
};

const TYPE_COLORS: Record<string, string> = {
  system: "text-text-secondary",
  deadline_warning: "text-error",
  match_new: "text-accent-teal",
  application_update: "text-primary-navy",
  score_updated: "text-highlight-gold",
  nudge: "text-accent-teal",
  achievement: "text-highlight-gold",
};

const TYPE_LABELS: Record<string, string> = {
  deadline_warning: "Deadline Warnings",
  match_new: "New Matches",
  application_update: "Application Updates",
  score_updated: "Score Updates",
  nudge: "Nudges",
  system: "System",
  achievement: "Achievements",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

const ITEMS_PER_PAGE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });

      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();
      setNotifications(result.data ?? []);
      setTotal(result.total ?? 0);
      setUnreadCount(result.unreadCount ?? 0);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [user, page, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  async function handleMarkAllAsRead() {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!response.ok) throw new Error("Failed to mark as read");

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  }

  async function handleMarkOneAsRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      handleMarkOneAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  }

  if (userLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Notifications
          </h2>
          <p className="text-sm text-text-secondary">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={typeFilter}
            onValueChange={(val) => setTypeFilter(val)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="shrink-0"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card className="rounded-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-4">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-teal/10 mb-4">
                <Inbox className="h-8 w-8 text-accent-teal" />
              </div>
              <p className="text-lg font-medium text-text-primary">
                You're all caught up!
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                No new notifications.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification, idx) => {
                const Icon = TYPE_ICONS[notification.type] ?? Bell;
                const iconColor =
                  TYPE_COLORS[notification.type] ?? "text-text-secondary";

                return (
                  <div key={notification.id}>
                    {idx > 0 && <Separator />}
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-bg-page ${
                        !notification.read ? "bg-accent-teal/5" : ""
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          !notification.read
                            ? "bg-accent-teal/10"
                            : "bg-bg-page"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm text-text-primary ${
                              !notification.read
                                ? "font-semibold"
                                : "font-normal"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 shrink-0 rounded-full bg-accent-teal" />
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-text-secondary">
                          {notification.body}
                        </p>
                        <p className="mt-1.5 text-xs text-text-secondary/60">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
