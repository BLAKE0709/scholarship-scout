"use client";

import { useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  format,
  parseISO,
  formatDistanceToNow,
  differenceInDays,
} from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DocumentUploader } from "@/components/applications/document-uploader";
import {
  useApplication,
  useUpdateApplication,
  useDeleteDocument,
  type ApplicationDetail,
  type EssayItem,
  type DocumentItem,
} from "@/hooks/use-applications";

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: "Draft", color: "text-gray-700", bgColor: "bg-gray-100" },
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
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-100" },
  withdrawn: {
    label: "Withdrawn",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
  },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["in_progress", "withdrawn"],
  in_progress: ["submitted", "draft", "withdrawn"],
  submitted: ["withdrawn"],
  under_review: [],
  accepted: [],
  rejected: [],
  withdrawn: ["draft"],
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config.color} ${config.bgColor}`}
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

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: response, isLoading, error } = useApplication(id);
  const updateApplication = useUpdateApplication();

  const application = response?.data;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-60 rounded-xl" />
          </div>
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !application) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-12 w-12 text-text-secondary" />
        <h2 className="mt-4 text-xl font-semibold text-text-primary">
          Application not found
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {error instanceof Error
            ? error.message
            : "Could not load this application."}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/applications")}
        >
          Back to Applications
        </Button>
      </div>
    );
  }

  return (
    <ApplicationDetailContent
      application={application}
      onUpdate={(data) =>
        updateApplication.mutate(
          { id, ...data },
          {
            onError: (err) =>
              toast.error(err instanceof Error ? err.message : "Update failed"),
          },
        )
      }
      isUpdating={updateApplication.isPending}
    />
  );
}

// ── Detail Content ───────────────────────────────────────────────────────────

function ApplicationDetailContent({
  application,
  onUpdate,
  isUpdating,
}: {
  application: ApplicationDetail;
  onUpdate: (data: { status?: string; notes?: string }) => void;
  isUpdating: boolean;
}) {
  const router = useRouter();

  const deadlineDays = application.deadline
    ? differenceInDays(parseISO(application.deadline), new Date())
    : null;

  const deadlineLabel =
    deadlineDays !== null
      ? deadlineDays < 0
        ? "Past deadline"
        : deadlineDays === 0
          ? "Due today"
          : `${deadlineDays} day${deadlineDays !== 1 ? "s" : ""} left`
      : "No deadline";

  const deadlineColor =
    deadlineDays !== null
      ? deadlineDays < 0
        ? "text-gray-500"
        : deadlineDays <= 3
          ? "text-[var(--error)]"
          : deadlineDays <= 14
            ? "text-[var(--warning)]"
            : "text-accent-teal"
      : "text-text-secondary";

  const allowedTransitions = STATUS_TRANSITIONS[application.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/applications")}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary-navy">
              {application.scholarshipName}
            </h1>
            <StatusBadge status={application.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-mono font-semibold text-highlight-gold">
              {formatAmount(application.amountMin, application.amountMax)}
            </span>
            <span className={`flex items-center gap-1 ${deadlineColor}`}>
              <Clock className="h-4 w-4" />
              {deadlineLabel}
            </span>
            {application.deadline && (
              <span className="flex items-center gap-1 text-text-secondary">
                <Calendar className="h-4 w-4" />
                {format(parseISO(application.deadline), "MMMM d, yyyy")}
              </span>
            )}
          </div>
        </div>

        {/* Status change buttons */}
        <div className="flex gap-2">
          {allowedTransitions.map((status) => {
            const config = STATUS_CONFIG[status];
            const isWithdraw = status === "withdrawn";
            return (
              <Button
                key={status}
                variant={isWithdraw ? "outline" : "default"}
                size="sm"
                disabled={isUpdating}
                className={
                  isWithdraw
                    ? "text-[var(--error)] hover:bg-red-50"
                    : "bg-accent-teal hover:bg-accent-teal/90"
                }
                onClick={() => onUpdate({ status })}
              >
                {config?.label ?? status}
              </Button>
            );
          })}
          {application.applicationUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={application.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                External
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="essays">
            Essays ({application.essays.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({application.documents.length})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab application={application} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="essays" className="mt-4">
          <EssaysTab application={application} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab application={application} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityTab application={application} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  application,
  onUpdate,
}: {
  application: ApplicationDetail;
  onUpdate: (data: { notes?: string }) => void;
}) {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [localNotes, setLocalNotes] = useState(application.notes ?? "");

  const handleNotesBlur = useCallback(() => {
    const trimmed = localNotes.trim();
    if (trimmed !== (application.notes ?? "").trim()) {
      onUpdate({ notes: trimmed });
      toast.success("Notes saved");
    }
  }, [localNotes, application.notes, onUpdate]);

  // Parse requirements from JSON
  const requirements = application.requirements as Record<
    string,
    unknown
  > | null;
  const reqItems: { key: string; label: string; met: boolean }[] = [];
  if (requirements && typeof requirements === "object") {
    Object.entries(requirements).forEach(([key, value]) => {
      reqItems.push({
        key,
        label: String(key)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        met: typeof value === "boolean" ? value : false,
      });
    });
  }

  const metCount = reqItems.filter((r) => r.met).length;
  const totalReqs = reqItems.length;
  const progressPct =
    totalReqs > 0 ? Math.round((metCount / totalReqs) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Requirements checklist */}
      <div className="rounded-xl border border-border-light bg-surface p-5">
        <h3 className="text-sm font-semibold text-text-primary">
          Requirements
        </h3>
        {reqItems.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">
            No specific requirements listed for this scholarship.
          </p>
        ) : (
          <>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-text-secondary">
                <span>
                  {metCount} of {totalReqs} complete
                </span>
                <span>{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
            <ul className="mt-4 space-y-2">
              {reqItems.map((req) => (
                <li key={req.key} className="flex items-center gap-2 text-sm">
                  <CheckCircle
                    className={`h-4 w-4 shrink-0 ${
                      req.met ? "text-green-500" : "text-gray-300"
                    }`}
                  />
                  <span
                    className={
                      req.met ? "text-text-primary" : "text-text-secondary"
                    }
                  >
                    {req.label}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border-light bg-surface p-5">
        <h3 className="text-sm font-semibold text-text-primary">Notes</h3>
        <p className="mt-1 text-xs text-text-secondary">
          Auto-saves when you click away
        </p>
        <Textarea
          ref={notesRef}
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes about this application..."
          className="mt-3 min-h-[160px]"
        />
      </div>

      {/* Description */}
      {application.scholarshipDescription && (
        <div className="lg:col-span-2 rounded-xl border border-border-light bg-surface p-5">
          <h3 className="text-sm font-semibold text-text-primary">
            Scholarship Description
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {application.scholarshipDescription}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Essays Tab ───────────────────────────────────────────────────────────────

function EssaysTab({ application }: { application: ApplicationDetail }) {
  const router = useRouter();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedEssayId, setSelectedEssayId] = useState("");

  const handleLinkEssay = async () => {
    if (!selectedEssayId) return;

    try {
      const res = await fetch(`/api/essays/${selectedEssayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id }),
      });

      if (!res.ok) throw new Error("Failed to link essay");

      toast.success("Essay linked to application");
      setLinkDialogOpen(false);
      setSelectedEssayId("");
      // Refresh page data
      window.location.reload();
    } catch {
      toast.error("Failed to link essay");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {application.essays.length} essay
          {application.essays.length !== 1 ? "s" : ""} linked
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
          >
            <Link2 className="mr-1.5 h-4 w-4" />
            Link Existing Essay
          </Button>
          <Button
            size="sm"
            className="bg-accent-teal hover:bg-accent-teal/90"
            onClick={() => router.push(`/essays?application=${application.id}`)}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            New Essay
          </Button>
        </div>
      </div>

      {application.essays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-light py-12 text-center">
          <FileText className="h-8 w-8 text-text-secondary" />
          <p className="mt-2 text-sm text-text-secondary">
            No essays linked yet. Create a new essay or link an existing one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {application.essays.map((essay) => (
            <EssayCard key={essay.id} essay={essay} />
          ))}
        </div>
      )}

      {/* Link essay dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Existing Essay</DialogTitle>
            <DialogDescription>
              Select an essay from your workspace to link to this application.
            </DialogDescription>
          </DialogHeader>

          {application.availableEssays.length === 0 ? (
            <p className="py-4 text-sm text-text-secondary">
              No unlinked essays available. Create a new essay first.
            </p>
          ) : (
            <div className="space-y-1.5 py-4">
              <label className="text-sm font-medium text-text-primary">
                Essay
              </label>
              <Select
                value={selectedEssayId}
                onValueChange={setSelectedEssayId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an essay" />
                </SelectTrigger>
                <SelectContent>
                  {application.availableEssays.map((essay) => (
                    <SelectItem key={essay.id} value={essay.id}>
                      <span>{essay.title}</span>
                      <span className="ml-2 text-xs text-text-secondary">
                        ({essay.wordCount} words)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-accent-teal hover:bg-accent-teal/90"
              onClick={handleLinkEssay}
              disabled={!selectedEssayId}
            >
              Link Essay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EssayCard({ essay }: { essay: EssayItem }) {
  const router = useRouter();

  const essayStatusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    review: "bg-amber-100 text-amber-700",
    final: "bg-green-100 text-green-700",
  };

  return (
    <div
      className="flex items-center justify-between rounded-xl border border-border-light bg-surface p-4 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={() => router.push(`/essays/${essay.id}`)}
    >
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-accent-teal" />
        <div>
          <p className="text-sm font-medium text-text-primary">{essay.title}</p>
          <p className="text-xs text-text-secondary">
            {essay.wordCount} words
            {essay.fidelityScore !== null &&
              ` | Fidelity: ${essay.fidelityScore}`}
          </p>
        </div>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          essayStatusColors[essay.status] ?? essayStatusColors.draft
        }`}
      >
        {essay.status.charAt(0).toUpperCase() + essay.status.slice(1)}
      </span>
    </div>
  );
}

// ── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ application }: { application: ApplicationDetail }) {
  const deleteDocument = useDeleteDocument();

  const handleDelete = (docId: string, docName: string) => {
    if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return;

    deleteDocument.mutate(
      { applicationId: application.id, documentId: docId },
      {
        onSuccess: () => {
          toast.success("Document deleted");
          window.location.reload();
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to delete document",
          ),
      },
    );
  };

  const docTypeLabels: Record<string, string> = {
    transcript: "Transcript",
    recommendation_letter: "Recommendation",
    certificate: "Certificate",
    financial_aid: "Financial Aid",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <DocumentUploader
        applicationId={application.id}
        studentId={application.studentId}
        onUploadComplete={() => window.location.reload()}
      />

      {/* Document list */}
      {application.documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-light py-8 text-center">
          <Upload className="h-8 w-8 text-text-secondary" />
          <p className="mt-2 text-sm text-text-secondary">
            No documents uploaded yet
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">
            Uploaded Documents
          </h3>
          {application.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-border-light bg-surface p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 shrink-0 text-accent-teal" />
                <div className="min-w-0">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-text-primary hover:text-accent-teal"
                  >
                    {doc.name}
                  </a>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>{docTypeLabels[doc.type] ?? doc.type}</span>
                    {doc.fileSize && (
                      <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                    )}
                    <span>
                      {format(parseISO(doc.uploadedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-text-secondary hover:text-[var(--error)]"
                onClick={() => handleDelete(doc.id, doc.name)}
                disabled={deleteDocument.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ application }: { application: ApplicationDetail }) {
  // Build timeline from available data
  const events: { date: string; label: string; detail: string }[] = [];

  events.push({
    date: application.createdAt,
    label: "Application Created",
    detail: `Started application for ${application.scholarshipName}`,
  });

  if (
    application.submittedAt &&
    application.submittedAt !== application.createdAt
  ) {
    events.push({
      date: application.submittedAt,
      label: "Application Submitted",
      detail: "Submitted for review",
    });
  }

  for (const essay of application.essays) {
    events.push({
      date: essay.createdAt,
      label: "Essay Added",
      detail: `"${essay.title}" linked to application`,
    });
  }

  for (const doc of application.documents) {
    events.push({
      date: doc.uploadedAt,
      label: "Document Uploaded",
      detail: `"${doc.name}" uploaded`,
    });
  }

  // Sort newest first
  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-light py-12 text-center">
        <Clock className="h-8 w-8 text-text-secondary" />
        <p className="mt-2 text-sm text-text-secondary">
          No activity recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative pl-6">
        {/* Timeline line */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-border-light" />

        {events.map((event, idx) => (
          <div key={idx} className="relative pb-6 last:pb-0">
            {/* Timeline dot */}
            <div className="absolute -left-4 top-1.5 h-3 w-3 rounded-full border-2 border-accent-teal bg-surface" />

            <div className="ml-4">
              <p className="text-sm font-medium text-text-primary">
                {event.label}
              </p>
              <p className="text-xs text-text-secondary">{event.detail}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {formatDistanceToNow(parseISO(event.date), {
                  addSuffix: true,
                })}
                {" -- "}
                {format(parseISO(event.date), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
