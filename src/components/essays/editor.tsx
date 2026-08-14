"use client";

import { useRef, useEffect } from "react";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  prompt?: string | null;
  placeholder?: string;
}

export function EssayEditor({
  content,
  onChange,
  prompt,
  placeholder = "Start writing your essay...",
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, 400)}px`;
    }
  }, [content]);

  return (
    <div className="flex flex-col h-full">
      {prompt && (
        <div className="mb-4 rounded-lg border border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent-teal)]">
            Essay Prompt
          </p>
          <p className="mt-1 text-sm text-[var(--text-primary)] leading-relaxed">
            {prompt}
          </p>
        </div>
      )}
      <div className="flex-1 rounded-lg border border-[var(--border-light)] bg-white focus-within:border-[var(--accent-teal)]/40 focus-within:ring-1 focus-within:ring-[var(--accent-teal)]/20 transition-all">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-none border-0 bg-transparent p-8 text-base leading-[1.8] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-0 min-h-[400px]"
          style={{ fontFamily: "Inter, sans-serif", fontSize: "16px" }}
          spellCheck
        />
      </div>
      <div className="mt-2 flex items-center justify-end px-1">
        <span className="text-xs text-[var(--text-secondary)]">
          {content.trim() ? content.trim().split(/\s+/).length : 0} words
          {" / "}
          {content.length} characters
        </span>
      </div>
    </div>
  );
}
