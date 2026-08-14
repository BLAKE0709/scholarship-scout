"use client";

import { useState } from "react";
import { AlertTriangle, Clock, UserX, ShieldAlert, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface AtRiskStudent {
  userId: string;
  fullName: string;
  riskType: "deadline" | "inactive" | "incomplete";
  description: string;
}

interface AtRiskListProps {
  students: AtRiskStudent[];
  onNudgeSent?: () => void;
}

const riskConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    badgeClass: string;
  }
> = {
  deadline: {
    icon: Clock,
    label: "Deadline",
    badgeClass: "bg-error/10 text-error border-error/20",
  },
  inactive: {
    icon: UserX,
    label: "Inactive",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
  },
  incomplete: {
    icon: ShieldAlert,
    label: "Incomplete",
    badgeClass:
      "bg-highlight-gold/10 text-highlight-gold border-highlight-gold/20",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AtRiskList({ students, onNudgeSent }: AtRiskListProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingNudge, setPendingNudge] = useState<AtRiskStudent | null>(null);
  const [sending, setSending] = useState(false);

  // Sort by urgency: deadline first, then inactive, then incomplete
  const sortOrder: Record<string, number> = {
    deadline: 0,
    inactive: 1,
    incomplete: 2,
  };
  const sorted = [...students].sort(
    (a, b) => (sortOrder[a.riskType] ?? 3) - (sortOrder[b.riskType] ?? 3),
  );

  function handleNudgeClick(student: AtRiskStudent) {
    setPendingNudge(student);
    setConfirmOpen(true);
  }

  async function confirmNudge() {
    if (!pendingNudge) return;
    setSending(true);

    try {
      const res = await fetch("/api/counselor/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: pendingNudge.userId,
          nudgeType: pendingNudge.riskType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to send nudge");
        return;
      }

      toast.success(`Nudge sent to ${pendingNudge.fullName}`);
      onNudgeSent?.();
    } catch {
      toast.error("Network error sending nudge");
    } finally {
      setSending(false);
      setConfirmOpen(false);
      setPendingNudge(null);
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle className="h-10 w-10 text-text-secondary/30 mb-2" />
        <p className="text-sm text-text-secondary">No at-risk students</p>
        <p className="text-xs text-text-secondary/70 mt-1">
          All your students are on track!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {sorted.map((student, idx) => {
          const config = riskConfig[student.riskType] ?? riskConfig.inactive;
          const RiskIcon = config.icon;

          return (
            <div
              key={`${student.userId}-${student.riskType}-${idx}`}
              className="flex items-center gap-3 rounded-lg border border-border-light bg-surface p-3"
            >
              {/* Avatar initials */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-navy/10 text-xs font-semibold text-primary-navy">
                {getInitials(student.fullName)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {student.fullName}
                  </p>
                  <Badge variant="outline" className={config.badgeClass}>
                    <RiskIcon className="mr-1 h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-text-secondary truncate">
                  {student.description}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => handleNudgeClick(student)}
              >
                <Send className="h-3 w-3 mr-1" />
                Nudge
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Nudge</DialogTitle>
            <DialogDescription>
              Send a reminder notification to{" "}
              <span className="font-medium text-text-primary">
                {pendingNudge?.fullName}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          {pendingNudge && (
            <p className="text-sm text-text-secondary rounded-lg bg-bg-page p-3">
              {pendingNudge.riskType === "deadline" &&
                "You have a scholarship deadline approaching! Don't miss out."}
              {pendingNudge.riskType === "inactive" &&
                "We haven't seen you in a while. Your scholarships are waiting!"}
              {pendingNudge.riskType === "incomplete" &&
                "Complete your profile to unlock better scholarship matches."}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={confirmNudge} disabled={sending}>
              {sending ? "Sending..." : "Send Nudge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
