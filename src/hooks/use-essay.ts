"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface EssayData {
  id: string;
  title: string;
  content: string;
  prompt: string | null;
  wordCount: number;
  status: string;
  fidelityScore: number | null;
  apsScore: number | null;
}

interface UseEssayReturn {
  content: string;
  setContent: (c: string) => void;
  title: string;
  setTitle: (t: string) => void;
  wordCount: number;
  status: string;
  isSaving: boolean;
  lastSaved: Date | null;
  timeSpent: number;
  saveContent: () => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
  updateTitle: (title: string) => Promise<void>;
}

export function useEssay(essay: EssayData): UseEssayReturn {
  const [content, setContentState] = useState(essay.content);
  const [title, setTitleState] = useState(essay.title);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [status, setStatus] = useState(essay.status);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeTrackingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocusedRef = useRef(false);
  const contentRef = useRef(content);
  const timeSpentRef = useRef(timeSpent);
  const lastSavedContentRef = useRef(content);

  contentRef.current = content;
  timeSpentRef.current = timeSpent;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Time tracking
  useEffect(() => {
    const handleFocus = () => {
      isFocusedRef.current = true;
      timeTrackingRef.current = setInterval(() => {
        setTimeSpent((t) => t + 1);
      }, 1000);
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
      if (timeTrackingRef.current) {
        clearInterval(timeTrackingRef.current);
        timeTrackingRef.current = null;
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      if (timeTrackingRef.current) clearInterval(timeTrackingRef.current);
    };
  }, []);

  const saveContent = useCallback(async () => {
    const currentContent = contentRef.current;
    const wc = currentContent.trim()
      ? currentContent.trim().split(/\s+/).length
      : 0;

    setIsSaving(true);
    try {
      // Update essay
      await fetch(`/api/essays/${essay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentContent, wordCount: wc }),
      });

      // Only create revision if content changed meaningfully (>20 chars diff or >5 word diff)
      const lastContent = lastSavedContentRef.current;
      const charDiff = Math.abs(currentContent.length - lastContent.length);
      const lastWc = lastContent.trim()
        ? lastContent.trim().split(/\s+/).length
        : 0;
      const wordDiff = Math.abs(wc - lastWc);
      const contentChanged = charDiff > 20 || wordDiff > 5;

      if (contentChanged && currentContent.trim().length > 0) {
        await fetch(`/api/essays/${essay.id}/revisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: currentContent,
            wordCount: wc,
            timeSpentSeconds: timeSpentRef.current,
          }),
        });
        lastSavedContentRef.current = currentContent;
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error("[useEssay] Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [essay.id]);

  // Auto-save with 3s debounce
  const setContent = useCallback(
    (newContent: string) => {
      setContentState(newContent);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveContent();
      }, 3000);
    },
    [saveContent],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updateStatus = useCallback(
    async (newStatus: string) => {
      setStatus(newStatus);
      await fetch(`/api/essays/${essay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    },
    [essay.id],
  );

  const updateTitle = useCallback(
    async (newTitle: string) => {
      setTitleState(newTitle);
      await fetch(`/api/essays/${essay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    },
    [essay.id],
  );

  const setTitle = useCallback((t: string) => {
    setTitleState(t);
  }, []);

  return {
    content,
    setContent,
    title,
    setTitle,
    wordCount,
    status,
    isSaving,
    lastSaved,
    timeSpent,
    saveContent,
    updateStatus,
    updateTitle,
  };
}
