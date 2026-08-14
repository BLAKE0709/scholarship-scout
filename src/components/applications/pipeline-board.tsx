"use client";

import { useState } from "react";
import { ApplicationCard } from "./application-card";

interface PipelineApplication {
  id: string;
  scholarshipName: string;
  amountMin: number;
  amountMax: number | null;
  deadline: string | null;
  essayCount: number;
  status: string;
}

interface PipelineBoardProps {
  applications: PipelineApplication[];
  onStatusChange: (id: string, newStatus: string) => void;
}

const COLUMNS = [
  { key: "draft", label: "Draft", bg: "bg-gray-50", border: "border-gray-200" },
  {
    key: "in_progress",
    label: "In Progress",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    key: "submitted",
    label: "Submitted",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
  {
    key: "under_review",
    label: "Under Review",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    key: "accepted",
    label: "Accepted",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  {
    key: "rejected",
    label: "Rejected",
    bg: "bg-red-50",
    border: "border-red-200",
  },
] as const;

export function PipelineBoard({
  applications,
  onStatusChange,
}: PipelineBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Group applications by status
  const grouped: Record<string, PipelineApplication[]> = {};
  for (const col of COLUMNS) {
    grouped[col.key] = [];
  }
  for (const app of applications) {
    // Withdrawn apps don't show in pipeline
    if (app.status === "withdrawn") continue;
    if (grouped[app.status]) {
      grouped[app.status].push(app);
    }
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent, columnKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  function handleDrop(e: React.DragEvent, columnKey: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id && id !== draggedId) {
      // Fallback: use the id from dataTransfer
      onStatusChange(id, columnKey);
    } else if (draggedId) {
      const draggedApp = applications.find((a) => a.id === draggedId);
      if (draggedApp && draggedApp.status !== columnKey) {
        onStatusChange(draggedId, columnKey);
      }
    }
    setDraggedId(null);
    setDragOverColumn(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = grouped[col.key] ?? [];
        const isOver = dragOverColumn === col.key;

        return (
          <div
            key={col.key}
            className={`flex w-[280px] min-w-[280px] flex-col rounded-xl border ${col.border} ${col.bg} transition-shadow ${
              isOver ? "ring-2 ring-accent-teal/40" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-light">
              <h3 className="text-sm font-semibold text-text-primary">
                {col.label}
              </h3>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-medium text-text-secondary shadow-sm">
                {items.length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
              {items.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-xs text-text-secondary">
                    Drop applications here
                  </p>
                </div>
              )}
              {items.map((app) => (
                <div key={app.id} onDragStart={() => handleDragStart(app.id)}>
                  <ApplicationCard application={app} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
