"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

interface CancellationDialogProps {
  open: boolean;
  planName: string;
  features: string[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CancellationDialog({
  open,
  planName,
  features,
  onConfirm,
  onCancel,
  isLoading,
}: CancellationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="bg-surface sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <DialogTitle className="text-center text-text-primary">
            Cancel {planName} Plan?
          </DialogTitle>
          <DialogDescription className="text-center text-text-secondary">
            You will lose access to these features at the end of your billing
            period:
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 rounded-lg bg-bg-page p-4">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-text-secondary"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white"
            onClick={onCancel}
            disabled={isLoading}
          >
            Keep My Plan
          </Button>
          <Button
            variant="ghost"
            className="w-full text-text-secondary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Cancelling..." : "Cancel Anyway"}
          </Button>
        </DialogFooter>

        <p className="text-center text-xs text-text-secondary">
          Having issues?{" "}
          <a
            href="mailto:support@scholarshipscout.com"
            className="text-accent-teal underline hover:text-accent-teal/80"
          >
            Contact us first.
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
