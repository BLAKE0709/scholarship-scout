"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const router = useRouter();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/notifications?limit=10&page=1");
      if (!response.ok) return;

      const result = await response.json();
      setNotifications(result.data ?? []);
      const newUnread = result.unreadCount ?? 0;

      // Trigger bounce if count increased
      if (newUnread > prevCountRef.current && prevCountRef.current >= 0) {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 1000);
      }

      prevCountRef.current = newUnread;
      setUnreadCount(newUnread);
    } catch {
      // Silent fail - polling will retry
    }
  }, [user]);

  // Initial fetch and polling
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleMarkAsRead(notificationId: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }

    setIsOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className={`relative text-text-secondary ${isBouncing ? "animate-bounce" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[380px] rounded-xl border border-border-light bg-surface shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent-teal/10 px-2 py-0.5 text-xs font-medium text-accent-teal">
                {unreadCount} new
              </span>
            )}
          </div>

          <Separator />

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Bell className="mb-2 h-8 w-8 text-text-secondary/30" />
                <p className="text-sm text-text-secondary">
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] ?? Bell;
                const iconColor =
                  TYPE_COLORS[notification.type] ?? "text-text-secondary";

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-page ${
                      !notification.read ? "bg-accent-teal/5 font-semibold" : ""
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm text-text-primary ${
                          !notification.read ? "font-semibold" : "font-normal"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary font-normal">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary/60 font-normal">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-teal" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between px-4 py-2.5">
                <button
                  onClick={() => {
                    router.push("/notifications");
                    setIsOpen(false);
                  }}
                  className="text-xs font-medium text-accent-teal hover:underline"
                >
                  View All
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary"
                  >
                    <Check className="h-3 w-3" />
                    Mark All as Read
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
