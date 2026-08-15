"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Bot, PenLine } from "lucide-react";

export function NewEssayDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [assistMode, setAssistMode] = useState<"solo" | "coached">("coached");

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          prompt: prompt.trim() || undefined,
          assistMode,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create essay");
      }

      const { data } = await res.json();
      setOpen(false);
      setTitle("");
      setPrompt("");
      router.push(`/essays/${data.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create essay",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/90">
          <Plus className="mr-2 h-4 w-4" />
          New Essay
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Essay</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Why I Deserve This Scholarship"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Essay Prompt{" "}
              <span className="text-[var(--text-secondary)] font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste the essay question or prompt here..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>How do you want to write this one?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  value: "solo" as const,
                  icon: PenLine,
                  label: "On my own",
                  blurb: "No coach on the page. Just you and the draft.",
                },
                {
                  value: "coached" as const,
                  icon: Bot,
                  label: "With the coach",
                  blurb:
                    "Ask for questions and feedback while you write. It never writes for you.",
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const selected = assistMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAssistMode(opt.value)}
                    aria-pressed={selected}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-[var(--accent-teal)] bg-[var(--accent-teal)]/5"
                        : "border-[var(--border-light)] hover:border-[var(--accent-teal)]/50"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                      <Icon className="h-4 w-4 text-[var(--accent-teal)]" />
                      {opt.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--text-secondary)]">
                      {opt.blurb}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              You can change this later. Each saved version records which way
              you were working.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || isCreating}
              className="bg-[var(--primary-navy)] hover:bg-[var(--primary-navy)]/90"
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Essay
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
