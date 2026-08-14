"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useUploadDocument } from "@/hooks/use-applications";

interface DocumentUploaderProps {
  applicationId: string;
  studentId: string;
  onUploadComplete?: () => void;
}

type UploadState = "idle" | "dragging-over" | "uploading" | "complete";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const DOC_TYPES = [
  { value: "transcript", label: "Transcript" },
  { value: "recommendation_letter", label: "Recommendation Letter" },
  { value: "certificate", label: "Certificate" },
  { value: "financial_aid", label: "Financial Aid" },
  { value: "other", label: "Other" },
];

export function DocumentUploader({
  applicationId,
  studentId,
  onUploadComplete,
}: DocumentUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadDocument();

  // Suppress unused var lint — studentId is used in the storage path server-side
  void studentId;

  const validateFile = useCallback((file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type (.${ext}). Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPG";
    }
    if (file.size > MAX_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 10MB`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
      setSelectedFile(file);
      if (!docName) {
        setDocName(file.name.replace(/\.[^.]+$/, ""));
      }
    },
    [validateFile, docName],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setUploadState("dragging-over");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState("idle");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setUploadState("idle");

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !docName || !docType) {
      toast.error("Please fill in all fields");
      return;
    }

    setUploadState("uploading");
    setProgress(0);

    try {
      await uploadMutation.mutateAsync({
        applicationId,
        file: selectedFile,
        name: docName,
        type: docType,
        onProgress: setProgress,
      });

      setUploadState("complete");
      toast.success("Document uploaded successfully");

      // Reset after showing success
      setTimeout(() => {
        setUploadState("idle");
        setSelectedFile(null);
        setDocName("");
        setDocType("");
        setProgress(0);
        onUploadComplete?.();
      }, 1500);
    } catch (error) {
      setUploadState("idle");
      toast.error(
        error instanceof Error ? error.message : "Failed to upload document",
      );
    }
  }, [
    selectedFile,
    docName,
    docType,
    applicationId,
    uploadMutation,
    onUploadComplete,
  ]);

  const reset = useCallback(() => {
    setSelectedFile(null);
    setDocName("");
    setDocType("");
    setUploadState("idle");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          uploadState === "dragging-over"
            ? "border-accent-teal bg-accent-teal/5"
            : uploadState === "complete"
              ? "border-green-400 bg-green-50"
              : "border-border-light hover:border-accent-teal/40 hover:bg-bg-page"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={handleInputChange}
        />

        {uploadState === "uploading" ? (
          <div className="w-full max-w-xs space-y-3 text-center">
            <Upload className="mx-auto h-8 w-8 animate-pulse text-accent-teal" />
            <p className="text-sm font-medium text-text-primary">
              Uploading...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-text-secondary">{progress}%</p>
          </div>
        ) : uploadState === "complete" ? (
          <div className="text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
            <p className="mt-2 text-sm font-medium text-green-700">
              Upload complete
            </p>
          </div>
        ) : selectedFile ? (
          <div className="text-center">
            <FileText className="mx-auto h-8 w-8 text-accent-teal" />
            <p className="mt-2 text-sm font-medium text-text-primary">
              {selectedFile.name}
            </p>
            <p className="text-xs text-text-secondary">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-text-secondary" />
            <p className="mt-2 text-sm font-medium text-text-primary">
              Drop a file here or click to browse
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              PDF, DOC, DOCX, PNG, JPG up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* File details form - shown when a file is selected */}
      {selectedFile &&
        uploadState !== "uploading" &&
        uploadState !== "complete" && (
          <div className="space-y-3 rounded-lg border border-border-light bg-surface p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Document Name
              </label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g., Official Transcript"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Document Type
              </label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={!docName || !docType}
                className="flex-1 bg-accent-teal hover:bg-accent-teal/90"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>

            {!docName && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--warning)]">
                <AlertCircle className="h-3 w-3" />
                <span>Please enter a document name</span>
              </div>
            )}
            {!docType && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--warning)]">
                <AlertCircle className="h-3 w-3" />
                <span>Please select a document type</span>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
