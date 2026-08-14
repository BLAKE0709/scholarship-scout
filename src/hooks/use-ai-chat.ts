"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseAIChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
}

interface ChatContext {
  essayContent?: string;
  essayPrompt?: string;
  essayTitle?: string;
  scholarshipName?: string;
}

export function useAIChat(
  essayId: string,
  studentId: string | undefined,
  context: ChatContext,
): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const contextRef = useRef(context);
  contextRef.current = context;

  const sendMessage = useCallback(
    async (message: string) => {
      setError(null);
      setIsLoading(true);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        const ctx = contextRef.current;
        const recentMessages = [...messagesRef.current, userMessage]
          .slice(-5)
          .map(
            (m) =>
              `${m.role === "user" ? "Student" : "Scout AI"}: ${m.content}`,
          )
          .join("\n");

        const contextParts: string[] = [];
        if (ctx.essayTitle) contextParts.push(`Essay Title: ${ctx.essayTitle}`);
        if (ctx.essayPrompt)
          contextParts.push(`Essay Prompt: ${ctx.essayPrompt}`);
        if (ctx.scholarshipName)
          contextParts.push(`Scholarship: ${ctx.scholarshipName}`);
        if (ctx.essayContent) {
          const truncated =
            ctx.essayContent.length > 3000
              ? ctx.essayContent.slice(0, 3000) + "..."
              : ctx.essayContent;
          contextParts.push(`Current Essay:\n${truncated}`);
        }

        const fullPrompt = [
          ...contextParts,
          `\nConversation:\n${recentMessages}`,
          `\nStudent's latest message: ${message}`,
        ].join("\n\n");

        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: "chat_assistant",
            prompt: fullPrompt,
            studentId,
            essayId,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error ?? "Failed to get AI response");
        }

        const data = await response.json();

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [essayId, studentId],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
