"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Send, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/hooks/use-ai-chat";

interface AISidebarProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSend: (message: string) => void;
}

const STARTERS = [
  "Help me brainstorm ideas",
  "Review my opening paragraph",
  "Is my argument clear?",
  "How can I make this more personal?",
];

export function AISidebar({
  messages,
  isLoading,
  error,
  onSend,
}: AISidebarProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border-light)] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-teal)]/10">
          <Bot className="h-4 w-4 text-[var(--accent-teal)]" />
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Scout AI
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-center text-xs text-[var(--text-secondary)]">
              Ask Scout for help with your essay
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => onSend(starter)}
                  disabled={isLoading}
                  className="rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] disabled:opacity-50"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--primary-navy)] text-white rounded-br-md"
                  : "bg-gray-100 text-[var(--text-primary)] rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 rounded-bl-md">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-teal)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                Scout is thinking...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border-light)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Scout for help..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-[var(--border-light)] px-3 py-2 text-sm focus:border-[var(--accent-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-teal)]/20"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 bg-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/90 h-9 w-9 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
