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
  /** Set when the last save attempt failed; the draft is still only local. */
  saveFailed: boolean;
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
  const [saveFailed, setSaveFailed] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [status, setStatus] = useState(essay.status);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeTrackingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocusedRef = useRef(false);
  const contentRef = useRef(content);
  const timeSpentRef = useRef(timeSpent);
  const lastSavedContentRef = useRef(content);
  const timeAtLastRevisionRef = useRef(0);
  const saveContentRef = useRef<() => Promise<void>>(async () => {});

  contentRef.current = content;
  timeSpentRef.current = timeSpent;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Time tracking
  useEffect(() => {
    const handleFocus = () => {
      if (timeTrackingRef.current) return;
      isFocusedRef.current = true;
      timeTrackingRef.current = setInterval(() => {
        setTimeSpent((t) => t + 1);
      }, 1000);
    };

    // The window is already focused when the editor mounts, so waiting for a
    // focus event meant the timer never started and every revision recorded 0s.
    if (typeof document !== "undefined" && document.hasFocus()) {
      handleFocus();
    }

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
      // Update essay. A failed response must never be reported as saved —
      // the student would keep writing against a draft that is only local.
      const res = await fetch(`/api/essays/${essay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentContent, wordCount: wc }),
        keepalive: true,
      });

      if (!res.ok) {
        throw new Error(`Save failed with status ${res.status}`);
      }

      // Only create revision if content changed meaningfully (>20 chars diff or >5 word diff)
      const lastContent = lastSavedContentRef.current;
      const charDiff = Math.abs(currentContent.length - lastContent.length);
      const lastWc = lastContent.trim()
        ? lastContent.trim().split(/\s+/).length
        : 0;
      const wordDiff = Math.abs(wc - lastWc);
      const contentChanged = charDiff > 20 || wordDiff > 5;

      if (contentChanged && currentContent.trim().length > 0) {
        const elapsed = timeSpentRef.current;
        const revRes = await fetch(`/api/essays/${essay.id}/revisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: currentContent,
            wordCount: wc,
            // Time attributable to this revision, not the whole page session.
            timeSpentSeconds: Math.max(
              0,
              elapsed - timeAtLastRevisionRef.current,
            ),
          }),
          keepalive: true,
        });

        // Only advance the revision baseline once the revision is durable,
        // otherwise this content is skipped by every later revision too.
        if (revRes.ok) {
          lastSavedContentRef.current = currentContent;
          timeAtLastRevisionRef.current = elapsed;
        }
      }

      setLastSaved(new Date());
      setSaveFailed(false);
    } catch (error) {
      console.error("[useEssay] Save failed:", error);
      setSaveFailed(true);
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

  saveContentRef.current = saveContent;

  // Flush a pending save instead of discarding it. Clearing the debounce timer
  // on unmount silently dropped anything typed in the last 3 seconds — the
  // back arrow, a nav click, or closing the tab all lost that text.
  useEffect(() => {
    const flush = () => {
      if (!saveTimerRef.current) return;
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      void saveContentRef.current();
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!saveTimerRef.current) return;
      flush(); // fetch uses keepalive, so it survives the unload
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flush();
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
    saveFailed,
    timeSpent,
    saveContent,
    updateStatus,
    updateTitle,
  };
}
