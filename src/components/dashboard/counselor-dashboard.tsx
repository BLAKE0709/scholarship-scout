"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  Trophy,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  AtRiskList,
  type AtRiskStudent,
} from "@/components/counselor/at-risk-list";
import { FidelityDistribution } from "@/components/counselor/fidelity-distribution";
import { StudentDetailDrawer } from "@/components/counselor/student-detail-drawer";

// ── Types ────────────────────────────────────────────────────────────────────

interface StudentRow {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  gradeLevel: string | null;
  schoolName: string | null;
  applicationCount: number;
  lastActive: string | null;
  vaultHealthScore: number;
}

interface FidelityBucket {
  bucket: string;
  count: number;
  color: string;
}

interface RecentWin {
  studentName: string;
  scholarshipName: string;
  amount: number;
  date: string;
}

interface CounselorStats {
  totalStudents: number;
  activeThisWeek: number;
  totalApplications: number;
  applicationsLastMonth: number;
  dollarsRecovered: number;
  atRiskCount: number;
  fidelityDistribution: Array<{ bucket: string; count: number }>;
  recentWins: RecentWin[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type SortField =
  | "fullName"
  | "gradeLevel"
  | "applicationCount"
  | "lastActive"
  | "status";
type SortDir = "asc" | "desc";

function getActivityStatus(
  lastActive: string | null,
): "active" | "warning" | "inactive" {
  if (!lastActive) return "inactive";
  const diff = Date.now() - new Date(lastActive).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days <= 7) return "active";
  if (days <= 30) return "warning";
  return "inactive";
}

function statusDot(status: "active" | "warning" | "inactive"): string {
  if (status === "active") return "bg-accent-teal";
  if (status === "warning") return "bg-warning";
  return "bg-error";
}

function statusLabel(status: "active" | "warning" | "inactive"): string {
  if (status === "active") return "Active";
  if (status === "warning") return "Idle";
  return "Inactive";
}

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatGrade(grade: string | null): string {
  if (!grade) return "N/A";
  return grade
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDollars(amount: number): string {
  if (amount >= 1000) {
    return `$${amount.toLocaleString()}`;
  }
  return `$${amount}`;
}

const FIDELITY_COLORS: Record<string, string> = {
  "90-100": "#10b981",
  "75-89": "#14b8a6",
  "60-74": "#f59e0b",
  "<60": "#ef4444",
};

const PAGE_SIZE = 20;

// ── Component ────────────────────────────────────────────────────────────────

export function CounselorDashboard() {
  const { user } = useUser();
  const supabase = createClient();

  // Data state
  const [stats, setStats] = useState<CounselorStats | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);

  // Table controls
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("fullName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  // Drawer
  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Fetch stats ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/counselor/stats");
      if (res.ok) {
        const data: CounselorStats = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("[CounselorDashboard] stats fetch error:", err);
    }
  }, []);

  // ── Fetch students ───────────────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort_by: "full_name",
        sort_order: "asc",
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/counselor/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.data ?? []);
        setTotalStudents(data.total ?? 0);
      }
    } catch (err) {
      console.error("[CounselorDashboard] students fetch error:", err);
    }
  }, [page, searchQuery]);

  // ── Build at-risk list from fetched students + stats ─────────────────────

  const buildAtRiskList = useCallback(() => {
    if (!students.length) {
      setAtRiskStudents([]);
      return;
    }

    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const risks: AtRiskStudent[] = [];
    const seen = new Set<string>();

    for (const s of students) {
      // Inactive 30+ days
      if (!s.lastActive || new Date(s.lastActive) < thirtyDaysAgo) {
        if (!seen.has(`${s.userId}-inactive`)) {
          risks.push({
            userId: s.userId,
            fullName: s.fullName,
            riskType: "inactive",
            description: s.lastActive
              ? `Last active ${formatLastActive(s.lastActive)}`
              : "Has never logged in",
          });
          seen.add(`${s.userId}-inactive`);
        }
      }

      // Vault health < 50%
      if (s.vaultHealthScore < 50) {
        if (!seen.has(`${s.userId}-incomplete`)) {
          risks.push({
            userId: s.userId,
            fullName: s.fullName,
            riskType: "incomplete",
            description: `Vault health at ${s.vaultHealthScore}% - profile incomplete`,
          });
          seen.add(`${s.userId}-incomplete`);
        }
      }
    }

    setAtRiskStudents(risks);
  }, [students]);

  // ── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchStats(), fetchStudents()]);
      setLoading(false);
    }
    load();
  }, [fetchStats, fetchStudents]);

  useEffect(() => {
    buildAtRiskList();
  }, [buildAtRiskList]);

  // ── Client-side sorting ──────────────────────────────────────────────────

  const sortedStudents = useMemo(() => {
    const sorted = [...students];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "fullName":
          cmp = (a.fullName ?? "").localeCompare(b.fullName ?? "");
          break;
        case "gradeLevel":
          cmp = (a.gradeLevel ?? "").localeCompare(b.gradeLevel ?? "");
          break;
        case "applicationCount":
          cmp = a.applicationCount - b.applicationCount;
          break;
        case "lastActive": {
          const aTime = a.lastActive ? new Date(a.lastActive).getTime() : 0;
          const bTime = b.lastActive ? new Date(b.lastActive).getTime() : 0;
          cmp = aTime - bTime;
          break;
        }
        case "status": {
          const order = { active: 0, warning: 1, inactive: 2 };
          cmp =
            order[getActivityStatus(a.lastActive)] -
            order[getActivityStatus(b.lastActive)];
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [students, sortField, sortDir]);

  // ── Sort handler ─────────────────────────────────────────────────────────

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // ── Search handler ───────────────────────────────────────────────────────

  function handleSearch(value: string) {
    setSearchQuery(value);
    setPage(1);
  }

  // ── Row click handler ────────────────────────────────────────────────────

  function handleRowClick(student: StudentRow) {
    setDrawerStudentId(student.userId);
    setDrawerOpen(true);
  }

  // ── Pagination ───────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(totalStudents / PAGE_SIZE));

  // ── Trend calculation ────────────────────────────────────────────────────

  function applicationTrend(): "up" | "down" | "neutral" {
    if (!stats) return "neutral";
    if (stats.totalApplications > stats.applicationsLastMonth) return "up";
    if (stats.totalApplications < stats.applicationsLastMonth) return "down";
    return "neutral";
  }

  // ── Fidelity chart data ──────────────────────────────────────────────────

  const fidelityData: FidelityBucket[] = (
    stats?.fidelityDistribution ?? []
  ).map((b) => ({
    bucket: b.bucket,
    count: b.count,
    color: FIDELITY_COLORS[b.bucket] ?? "#6b7280",
  }));

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-96 rounded-xl lg:col-span-3" />
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* TOP ROW: 4 stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="My Students"
          value={String(stats?.totalStudents ?? 0)}
          subtitle={`${stats?.activeThisWeek ?? 0} active this week`}
          icon={Users}
          color="var(--color-accent-teal, #14b8a6)"
        />
        <StatCard
          title="Applications Submitted"
          value={String(stats?.totalApplications ?? 0)}
          subtitle={`${stats?.applicationsLastMonth ?? 0} last month`}
          icon={FileText}
          trend={applicationTrend()}
          color="var(--color-primary-navy, #1e3a5f)"
        />
        <StatCard
          title="Scholarship $ Recovered"
          value={formatDollars(stats?.dollarsRecovered ?? 0)}
          icon={DollarSign}
          color="var(--color-highlight-gold, #f59e0b)"
        />
        <StatCard
          title="At-Risk Students"
          value={String(stats?.atRiskCount ?? 0)}
          icon={AlertTriangle}
          color={
            (stats?.atRiskCount ?? 0) > 0
              ? "var(--color-error, #ef4444)"
              : "var(--color-text-secondary, #6b7280)"
          }
        />
      </div>

      {/* MIDDLE: Two columns */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* LEFT: Student Activity table */}
        <Card className="rounded-xl lg:col-span-3">
          <CardHeader>
            <CardTitle>Student Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border-light">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                        onClick={() => handleSort("fullName")}
                      >
                        Name
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                        onClick={() => handleSort("gradeLevel")}
                      >
                        Grade
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                        onClick={() => handleSort("applicationCount")}
                      >
                        Applications
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                        onClick={() => handleSort("lastActive")}
                      >
                        Last Active
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                        onClick={() => handleSort("status")}
                      >
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        <p className="text-sm text-text-secondary">
                          {searchQuery
                            ? "No students match your search"
                            : "No students linked yet"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedStudents.map((student) => {
                      const status = getActivityStatus(student.lastActive);
                      return (
                        <TableRow
                          key={student.userId}
                          className="cursor-pointer"
                          onClick={() => handleRowClick(student)}
                        >
                          <TableCell className="font-medium text-text-primary">
                            {student.fullName}
                          </TableCell>
                          <TableCell className="text-text-secondary">
                            {formatGrade(student.gradeLevel)}
                          </TableCell>
                          <TableCell className="font-mono text-text-secondary">
                            {student.applicationCount}
                          </TableCell>
                          <TableCell className="text-text-secondary">
                            {formatLastActive(student.lastActive)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${statusDot(status)}`}
                              />
                              <span className="text-xs text-text-secondary">
                                {statusLabel(status)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-sm text-text-secondary">
                <span>
                  Page {page} of {totalPages} ({totalStudents} students)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT column */}
        <div className="space-y-4 lg:col-span-2">
          {/* At-Risk Alerts */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-error" />
                At-Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AtRiskList
                students={atRiskStudents}
                onNudgeSent={() => {
                  fetchStats();
                }}
              />
            </CardContent>
          </Card>

          {/* Fidelity Distribution */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Fidelity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <FidelityDistribution data={fidelityData} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BOTTOM: Recent Wins */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-highlight-gold" />
            Recent Wins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(stats?.recentWins ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Trophy className="h-10 w-10 text-text-secondary/30 mb-2" />
              <p className="text-sm text-text-secondary">
                No wins yet -- keep encouraging your students!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(stats?.recentWins ?? []).map((win, idx) => (
                <div
                  key={`win-${idx}`}
                  className="flex items-center gap-3 rounded-lg border border-border-light bg-surface p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-highlight-gold/10">
                    <Trophy className="h-4 w-4 text-highlight-gold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {win.studentName}{" "}
                      <span className="text-text-secondary font-normal">
                        won
                      </span>{" "}
                      {win.scholarshipName}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {new Date(win.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-lg font-bold text-highlight-gold">
                    {formatDollars(win.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Drawer */}
      {drawerStudentId && (
        <StudentDetailDrawer
          studentId={drawerStudentId}
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open);
            if (!open) setDrawerStudentId(null);
          }}
        />
      )}
    </div>
  );
}
