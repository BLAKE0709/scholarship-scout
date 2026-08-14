"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, FileText } from "lucide-react";

interface Revision {
  id: string;
  revisionNumber: number;
  wordCount: number | null;
  timeSpentSeconds: number | null;
  createdAt: string;
  content: string;
}

interface RevisionTrackerProps {
  essayId: string;
  totalTimeSpent: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function RevisionTracker({
  essayId,
  totalTimeSpent,
}: RevisionTrackerProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRevisions() {
      try {
        const res = await fetch(`/api/essays/${essayId}/revisions`);
        if (res.ok) {
          const { data } = await res.json();
          setRevisions(data ?? []);
        }
      } catch {
        // Ignore fetch errors
      } finally {
        setIsLoading(false);
      }
    }
    fetchRevisions();
  }, [essayId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-teal)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Time Summary */}
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
        <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
        <span className="text-sm text-[var(--text-secondary)]">
          Total time writing:{" "}
          <span className="font-mono font-medium text-[var(--text-primary)]">
            {formatTime(totalTimeSpent)}
          </span>
        </span>
      </div>

      {/* Revision Timeline */}
      {revisions.length === 0 ? (
        <p className="text-center text-xs text-[var(--text-secondary)] py-4">
          Revisions will appear here as you write
        </p>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-[var(--border-light)]" />

          {revisions.map((rev, index) => {
            const prevWordCount =
              index < revisions.length - 1
                ? (revisions[index + 1]?.wordCount ?? 0)
                : 0;
            const delta = (rev.wordCount ?? 0) - prevWordCount;
            const deltaStr =
              delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "0";

            return (
              <button
                key={rev.id}
                onClick={() => setSelectedRevision(rev)}
                className="relative flex w-full items-start gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-gray-50"
              >
                {/* Dot */}
                <div className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent-teal)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      Revision {rev.revisionNumber}
                    </span>
                    <span
                      className={`text-xs font-mono ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-gray-400"}`}
                    >
                      {deltaStr} words
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {new Date(rev.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {rev.wordCount != null && (
                      <span className="ml-2">{rev.wordCount} words</span>
                    )}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Revision Content Modal */}
      <Dialog
        open={!!selectedRevision}
        onOpenChange={() => setSelectedRevision(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Revision {selectedRevision?.revisionNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 rounded-lg bg-gray-50 p-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
              {selectedRevision?.content}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
