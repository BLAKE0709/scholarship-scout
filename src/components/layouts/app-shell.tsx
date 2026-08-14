"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FileText,
  PenTool,
  Archive,
  Settings,
  Users,
  BarChart3,
  Menu,
  LogOut,
  Link2,
  CreditCard,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/logo";
import { RoleBadge } from "@/components/shared/role-badge";
import { PlanBadge } from "@/components/billing/plan-badge";
import { TopBar } from "./top-bar";
import { useUser } from "@/hooks/use-user";
import { usePlan } from "@/hooks/use-plan";

type UserRole =
  | "student"
  | "parent"
  | "counselor"
  | "institution_admin"
  | "provider"
  | "superadmin";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navByRole: Record<string, NavItem[]> = {
  student: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Discover Scholarships", href: "/scholarships", icon: Search },
    { label: "My Applications", href: "/applications", icon: FileText },
    { label: "Essay Workspace", href: "/essays", icon: PenTool },
    { label: "My Vault", href: "/vault", icon: Archive },
    { label: "Family", href: "/settings/family", icon: Link2 },
    { label: "Billing", href: "/settings/billing", icon: CreditCard },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  parent: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Students", href: "/students", icon: Users },
    { label: "Family", href: "/settings/family", icon: Link2 },
    { label: "Billing", href: "/settings/billing", icon: CreditCard },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  counselor: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Students", href: "/students", icon: Users },
    { label: "Scholarships", href: "/scholarships", icon: Search },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
};

function getNavItems(role: UserRole): NavItem[] {
  return navByRole[role] ?? navByRole.student;
}

function getPageTitle(pathname: string, navItems: NavItem[]): string {
  const item = navItems.find((i) => i.href === pathname);
  return item?.label ?? "Dashboard";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, signOut, isLoading } = useUser();
  const { plan, isTrial, isLoading: planLoading } = usePlan();
  const [sheetOpen, setSheetOpen] = useState(false);

  const role: UserRole = (profile?.role as UserRole) ?? "student";
  const navItems = getNavItems(role);
  const mobileNavItems = navItems.slice(0, 4);
  const pageTitle = getPageTitle(pathname, navItems);

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const planSlug = (plan?.slug ?? "free") as
    | "free"
    | "pro"
    | "family"
    | "district";
  const trialDaysLeft =
    isTrial && plan?.currentPeriodEnd
      ? Math.max(
          0,
          Math.ceil(
            (new Date(plan.currentPeriodEnd).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  function NavContent({ onItemClick }: { onItemClick?: () => void }) {
    return (
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-accent-teal text-white"
                  : "text-text-secondary hover:bg-bg-page hover:text-text-primary"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-page">
      {/* Desktop Sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border-light bg-surface md:flex">
        {/* Sidebar Header */}
        <div className="flex h-16 items-center px-6 border-b border-border-light">
          <Logo />
        </div>

        {/* Sidebar Nav */}
        <div className="flex-1 py-4 overflow-y-auto">
          <NavContent />
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-border-light p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary-navy text-xs text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {profile?.fullName ?? "User"}
              </p>
              <RoleBadge role={role} />
              {!planLoading && (
                <div className="mt-1 flex items-center gap-1.5">
                  <PlanBadge plan={planSlug} isTrial={isTrial} />
                  {isTrial && trialDaysLeft !== null && (
                    <span className="text-[10px] text-highlight-gold">
                      {trialDaysLeft}d left
                    </span>
                  )}
                  {planSlug === "free" && !isTrial && (
                    <Link
                      href="/pricing"
                      className="text-[10px] text-accent-teal hover:underline"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-text-secondary hover:text-error"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex h-16 items-center justify-between border-b border-border-light bg-surface px-4">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center px-6 border-b border-border-light">
                <Logo />
              </div>
              <div className="py-4">
                <NavContent onItemClick={() => setSheetOpen(false)} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 border-t border-border-light p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary-navy text-xs text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {profile?.fullName ?? "User"}
                    </p>
                    <RoleBadge role={role} />
                    {!planLoading && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <PlanBadge plan={planSlug} isTrial={isTrial} />
                        {isTrial && trialDaysLeft !== null && (
                          <span className="text-[10px] text-highlight-gold">
                            {trialDaysLeft}d left
                          </span>
                        )}
                        {planSlug === "free" && !isTrial && (
                          <Link
                            href="/pricing"
                            className="text-[10px] text-accent-teal hover:underline"
                          >
                            Upgrade
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Logo compact />
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary-navy text-xs text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Desktop Top Bar */}
        <div className="hidden md:block">
          <TopBar
            title={pageTitle}
            userName={profile?.fullName ?? null}
            onSignOut={signOut}
          />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden flex border-t border-border-light bg-surface">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                  isActive ? "text-accent-teal" : "text-text-secondary"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
