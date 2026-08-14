"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  LayoutGrid,
  List,
  Plus,
  DollarSign,
  Clock,
  CheckCircle,
  Inbox,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PipelineBoard } from "@/components/applications/pipeline-board";
import {
  useApplications,
  useCreateApplication,
  useUpdateApplication,
} from "@/hooks/use-applications";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: "Draft",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  submitted: {
    label: "Submitted",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
  },
  under_review: {
    label: "Under Review",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  accepted: {
    label: "Accepted",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  withdrawn: {
    label: "Withdrawn",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.color} ${config.bgColor}`}
    >
      {config.label}
    </span>
  );
}

function formatAmount(min: number, max: number | null): string {
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  if (max && max !== min) return `${fmt(min)} - ${fmt(max)}`;
  return fmt(min);
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const router = useRouter();
  const { profile } = useUser();
  const { data: response, isLoading, error } = useApplications();
  const createApplication = useCreateApplication();
  const updateApplication = useUpdateApplication();

  const [newAppDialogOpen, setNewAppDialogOpen] = useState(false);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState("");

  const applications = response?.data ?? [];

  // Compute stats
  const stats = useMemo(() => {
    const active = applications.filter((a) => a.status !== "withdrawn");
    const submitted = active.filter((a) =>
      ["submitted", "under_review", "accepted"].includes(a.status),
    );
    const inProgress = active.filter((a) =>
      ["draft", "in_progress"].includes(a.status),
    );
    const accepted = active.filter((a) => a.status === "accepted");
    const totalValue = accepted.reduce(
      (sum, a) => sum + (a.amountMax ?? a.amountMin),
      0,
    );

    return {
      total: active.length,
      submitted: submitted.length,
      inProgress: inProgress.length,
      accepted: accepted.length,
      totalValue,
    };
  }, [applications]);

  const handleStatusChange = (id: string, newStatus: string) => {
    updateApplication.mutate(
      { id, status: newStatus },
      {
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to update status",
          );
        },
      },
    );
  };

  const handleCreateApplication = async () => {
    if (!selectedScholarshipId) {
      toast.error("Please select a scholarship");
      return;
    }

    try {
      await createApplication.mutateAsync({
        scholarshipId: selectedScholarshipId,
      });
      toast.success("Application created");
      setNewAppDialogOpen(false);
      setSelectedScholarshipId("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create application",
      );
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <FileText className="h-8 w-8 text-[var(--error)]" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">
          Failed to load applications
        </h2>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred."}
        </p>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (applications.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-navy">
              My Applications
            </h1>
            <p className="mt-1 text-text-secondary">
              Track and manage your scholarship applications
            </p>
          </div>
          <Button
            className="bg-accent-teal hover:bg-accent-teal/90"
            onClick={() => setNewAppDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-light py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-teal/10">
            <Inbox className="h-7 w-7 text-accent-teal" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[#14312e]">
            Turn a match into your first application
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-[#526461]">
            Choose a scholarship you want to pursue. Scout will keep its
            deadline and next steps in view.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/scholarships")}
          >
            Browse Scholarships
          </Button>
        </div>

        <NewApplicationDialog
          open={newAppDialogOpen}
          onOpenChange={setNewAppDialogOpen}
          selectedScholarshipId={selectedScholarshipId}
          onScholarshipIdChange={setSelectedScholarshipId}
          onSubmit={handleCreateApplication}
          isSubmitting={createApplication.isPending}
        />
      </div>
    );
  }

  // ── Main content ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-navy">
            My Applications
          </h1>
          <p className="mt-1 text-text-secondary">
            Track and manage your scholarship applications
          </p>
        </div>
        <Button
          className="bg-accent-teal hover:bg-accent-teal/90"
          onClick={() => setNewAppDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Application
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total"
          value={stats.total}
          icon={FileText}
          color="text-primary-navy"
        />
        <StatCard
          label="Submitted"
          value={stats.submitted}
          icon={CheckCircle}
          color="text-accent-teal"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={Clock}
          color="text-blue-600"
        />
        <StatCard
          label="Accepted"
          value={stats.accepted}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatCard
          label="Total Value"
          value={`$${stats.totalValue.toLocaleString()}`}
          icon={DollarSign}
          color="text-highlight-gold"
        />
      </div>

      {/* Pipeline / Table toggle */}
      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="table">
            <List className="mr-1.5 h-4 w-4" />
            Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineBoard
            applications={applications.map((a) => ({
              id: a.id,
              scholarshipName: a.scholarshipName,
              amountMin: a.amountMin,
              amountMax: a.amountMax,
              deadline: a.deadline,
              essayCount: a.essayCount,
              status: a.status,
            }))}
            onStatusChange={handleStatusChange}
          />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <div className="rounded-xl border border-border-light bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scholarship</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Essays</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications
                  .filter((a) => a.status !== "withdrawn")
                  .map((app) => (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/applications/${app.id}`)}
                    >
                      <TableCell className="font-medium text-text-primary">
                        {app.scholarshipName}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-highlight-gold">
                        {formatAmount(app.amountMin, app.amountMax)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {app.deadline
                          ? format(parseISO(app.deadline), "MMM d, yyyy")
                          : "No deadline"}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {app.essayCount}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {format(parseISO(app.updatedAt), "MMM d")}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <NewApplicationDialog
        open={newAppDialogOpen}
        onOpenChange={setNewAppDialogOpen}
        selectedScholarshipId={selectedScholarshipId}
        onScholarshipIdChange={setSelectedScholarshipId}
        onSubmit={handleCreateApplication}
        isSubmitting={createApplication.isPending}
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border-light bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-page">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs font-medium text-text-secondary">{label}</p>
          <p className={`font-mono text-xl font-bold ${color}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function NewApplicationDialog({
  open,
  onOpenChange,
  selectedScholarshipId,
  onScholarshipIdChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedScholarshipId: string;
  onScholarshipIdChange: (id: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  // For the dialog, we need to fetch matched scholarships the student can apply to
  // We use a simple inline fetch approach
  const [matchedScholarships, setMatchedScholarships] = useState<
    { id: string; name: string; amountMin: number; amountMax: number | null }[]
  >([]);
  const [loadingScholarships, setLoadingScholarships] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fetch scholarships when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && !loaded) {
      setLoadingScholarships(true);
      fetch("/api/applications?limit=100")
        .then((res) => res.json())
        .then((data) => {
          const existingScholarshipIds = new Set(
            (data.data ?? []).map(
              (a: { scholarshipId: string }) => a.scholarshipId,
            ),
          );
          // Fetch all scholarships from matches that don't have applications yet
          return fetch("/api/scholarships/match")
            .then((res) => res.json())
            .then((matchData) => {
              const scholarships = (matchData.data ?? [])
                .filter(
                  (m: { scholarshipId: string }) =>
                    !existingScholarshipIds.has(m.scholarshipId),
                )
                .map(
                  (m: {
                    scholarshipId: string;
                    scholarshipName: string;
                    amountMin: number;
                    amountMax: number | null;
                  }) => ({
                    id: m.scholarshipId,
                    name: m.scholarshipName,
                    amountMin: m.amountMin,
                    amountMax: m.amountMax,
                  }),
                );
              setMatchedScholarships(scholarships);
              setLoaded(true);
            });
        })
        .catch(() => {
          // If match endpoint doesn't exist or fails, show empty list
          setMatchedScholarships([]);
          setLoaded(true);
        })
        .finally(() => setLoadingScholarships(false));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Application</DialogTitle>
          <DialogDescription>
            Select a scholarship to start a new application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loadingScholarships ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : matchedScholarships.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No available scholarships found. Browse your matches first, or
              enter a scholarship ID manually.
            </p>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">
                Scholarship
              </label>
              <Select
                value={selectedScholarshipId}
                onValueChange={onScholarshipIdChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a scholarship" />
                </SelectTrigger>
                <SelectContent>
                  {matchedScholarships.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="mr-2">{s.name}</span>
                      <span className="text-xs text-text-secondary">
                        ({formatAmount(s.amountMin, s.amountMax)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-accent-teal hover:bg-accent-teal/90"
            onClick={onSubmit}
            disabled={!selectedScholarshipId || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
