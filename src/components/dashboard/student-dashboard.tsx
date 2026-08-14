"use client";

import Link from "next/link";
import {
  Target,
  Search,
  FileText,
  Fingerprint,
  Brain,
  PenTool,
  User,
  Archive,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "./stat-card";
import { DeadlineList } from "./deadline-list";
import { ActivityTimeline } from "./activity-timeline";
import { VaultHealth } from "./vault-health";
import { MatchScore } from "@/components/scholarships/match-score";
import type { StudentDashboardData } from "@/lib/dashboard/data-fetchers";

interface StudentDashboardProps {
  data: StudentDashboardData;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${amount}`;
}

function formatDeadlineShort(deadline: string | null): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const quickActions = [
  {
    title: "Find Scholarships",
    icon: Search,
    href: "/scholarships",
    description: "Discover new matches",
  },
  {
    title: "Write an Essay",
    icon: PenTool,
    href: "/essays",
    description: "Start or continue writing",
  },
  {
    title: "Update Profile",
    icon: User,
    href: "/settings",
    description: "Improve your vault score",
  },
  {
    title: "View Vault",
    icon: Archive,
    href: "/vault",
    description: "Manage your documents",
  },
];

export function StudentDashboard({ data }: StudentDashboardProps) {
  const { stats, topMatches, upcomingDeadlines, vaultHealth, recentActivity } =
    data;

  return (
    <div className="space-y-6">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Match Score"
          value={`${stats.matchScore}`}
          subtitle="Average match fit"
          icon={Target}
          trend="neutral"
          color="var(--accent-teal)"
        />
        <StatCard
          title="Scholarships Found"
          value={`${stats.matchCount}`}
          subtitle={`${formatCurrency(stats.totalMatchValue)} total value`}
          icon={Search}
          trend="neutral"
          color="var(--accent-teal)"
        />
        <StatCard
          title="Applications"
          value={`${stats.applicationCount.total}`}
          subtitle={`${stats.applicationCount.submitted} submitted, ${stats.applicationCount.accepted} accepted`}
          icon={FileText}
          trend="neutral"
          color="var(--primary-navy)"
        />
        <StatCard
          title="Fidelity Score"
          value={
            stats.latestFidelityScore !== null
              ? `${stats.latestFidelityScore}`
              : "--"
          }
          subtitle={stats.fidelityLabel}
          icon={Fingerprint}
          trend="neutral"
          color="var(--highlight-gold)"
        />
        <StatCard
          title="AI Proficiency"
          value={
            stats.latestApsScore !== null ? `${stats.latestApsScore}` : "--"
          }
          subtitle={stats.apsLevel}
          icon={Brain}
          trend="neutral"
          color="var(--primary-navy)"
        />
      </div>

      {/* Middle Section: Two Columns */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column (3 cols) */}
        <div className="space-y-6 lg:col-span-3">
          {/* Top Matches */}
          <Card className="rounded-xl border border-border-light bg-surface shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-text-primary">
                Your Top Matches
              </CardTitle>
              {topMatches.length > 0 && (
                <Link
                  href="/scholarships"
                  className="flex items-center gap-1 text-xs font-medium text-accent-teal hover:underline transition-colors duration-200"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {topMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Target className="h-10 w-10 text-text-secondary/30 mb-2" />
                  <p className="text-sm text-text-secondary">No matches yet</p>
                  <p className="text-xs text-text-secondary/70 mt-1">
                    Complete your profile and run a match to find scholarships
                  </p>
                  <Link
                    href="/scholarships"
                    className="mt-3 text-xs font-medium text-accent-teal hover:underline"
                  >
                    Discover scholarships
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {topMatches.map((match) => (
                    <Link
                      key={match.id}
                      href={`/scholarships/${match.scholarshipId}`}
                      className="flex items-center gap-3 rounded-lg border border-border-light p-3 transition-all duration-200 hover:border-accent-teal/30 hover:shadow-sm"
                    >
                      <MatchScore score={match.matchScore} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {match.scholarshipName}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
                          <span className="flex items-center gap-0.5 font-semibold text-highlight-gold">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(match.amount)}
                          </span>
                          {match.deadline && (
                            <span className="text-text-secondary">
                              Due {formatDeadlineShort(match.deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-text-secondary/40" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="rounded-xl border border-border-light bg-surface shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-text-primary">
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeadlineList deadlines={upcomingDeadlines} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Vault Health */}
          <Card className="rounded-xl border border-border-light bg-surface shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-text-primary">
                Vault Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VaultHealth health={vaultHealth} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="rounded-xl border border-border-light bg-surface shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-text-primary">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={recentActivity} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="group cursor-pointer rounded-xl border border-border-light bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-accent-teal/30">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-teal/10 transition-colors duration-200 group-hover:bg-accent-teal/20">
                    <Icon className="h-5 w-5 text-accent-teal" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-accent-teal transition-colors duration-200">
                      {action.title}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {action.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
