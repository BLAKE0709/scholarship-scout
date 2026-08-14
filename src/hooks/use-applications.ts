"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApplicationListItem {
  id: string;
  studentId: string;
  scholarshipId: string;
  matchId: string | null;
  status: string;
  submittedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  scholarshipName: string;
  amountMin: number;
  amountMax: number | null;
  deadline: string | null;
  essayCount: number;
}

export interface ApplicationDetail {
  id: string;
  studentId: string;
  scholarshipId: string;
  matchId: string | null;
  status: string;
  submittedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  scholarshipName: string;
  scholarshipDescription: string | null;
  amountMin: number;
  amountMax: number | null;
  deadline: string | null;
  requirements: Record<string, unknown>;
  applicationUrl: string | null;
  essays: EssayItem[];
  documents: DocumentItem[];
  availableEssays: AvailableEssay[];
}

export interface EssayItem {
  id: string;
  studentId: string;
  applicationId: string | null;
  title: string;
  content: string;
  prompt: string | null;
  wordCount: number;
  version: number;
  fidelityScore: number | null;
  apsScore: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  studentId: string;
  type: string;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableEssay {
  id: string;
  title: string;
  status: string;
  wordCount: number;
  applicationId: string | null;
  updatedAt: string;
}

// ── Fetch Helpers ────────────────────────────────────────────────────────────

async function fetchApplications(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ data: ApplicationListItem[]; total: number; page: number }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.status) searchParams.set("status", params.status);

  const res = await fetch(`/api/applications?${searchParams.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Failed to fetch applications");
  }
  return res.json();
}

async function fetchApplication(
  id: string,
): Promise<{ data: ApplicationDetail }> {
  const res = await fetch(`/api/applications/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Failed to fetch application");
  }
  return res.json();
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useApplications(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ["applications", params],
    queryFn: () => fetchApplications(params),
  });
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: ["application", id],
    queryFn: () => fetchApplication(id!),
    enabled: !!id,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      scholarshipId: string;
      matchId?: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to create application");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      status?: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to update application");
      }
      return res.json();
    },
    // Optimistic update for drag-and-drop status changes
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["applications"] });

      const previousData = queryClient.getQueryData([
        "applications",
        undefined,
      ]);

      queryClient.setQueriesData(
        { queryKey: ["applications"] },
        (
          old:
            | { data: ApplicationListItem[]; total: number; page: number }
            | undefined,
        ) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((app) =>
              app.id === variables.id
                ? {
                    ...app,
                    status: variables.status ?? app.status,
                    notes: variables.notes ?? app.notes,
                    updatedAt: new Date().toISOString(),
                  }
                : app,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["applications", undefined],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      file,
      name,
      type,
      onProgress,
    }: {
      applicationId: string;
      file: File;
      name: string;
      type: string;
      onProgress?: (percent: number) => void;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("type", type);

      // Use XMLHttpRequest for progress tracking
      return new Promise<{ data: DocumentItem }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid response"));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error ?? "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"));
        });

        xhr.open("POST", `/api/applications/${applicationId}/documents`);
        xhr.send(formData);
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["application", variables.applicationId],
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      documentId,
    }: {
      applicationId: string;
      documentId: string;
    }) => {
      const res = await fetch(
        `/api/applications/${applicationId}/documents?documentId=${documentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to delete document");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["application", variables.applicationId],
      });
    },
  });
}
