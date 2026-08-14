"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEssay } from "@/hooks/use-essay";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useUser } from "@/hooks/use-user";
import { EssayEditor } from "@/components/essays/editor";
import { AISidebar } from "@/components/essays/ai-sidebar";
import { RevisionTracker } from "@/components/essays/revision-tracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Bot,
  Check,
  Loader2,
  MessageSquare,
  History,
} from "lucide-react";

interface EssayData {
  id: string;
  title: string;
  content: string;
  prompt: string | null;
  wordCount: number;
  status: string;
  fidelityScore: number | null;
  apsScore: number | null;
  studentId: string;
}

export default function EssayWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useUser();
  const [essay, setEssay] = useState<EssayData | null>(null);
  const [loading, setLoading] = useState(true);

  const essayId = params.id as string;

  useEffect(() => {
    async function fetchEssay() {
      try {
        const res = await fetch(`/api/essays/${essayId}`);
        if (!res.ok) {
          router.push("/essays");
          return;
        }
        const { data } = await res.json();
        setEssay({
          id: data.id,
          title: data.title,
          content: data.content ?? "",
          prompt: data.prompt,
          wordCount: data.wordCount ?? 0,
          status: data.status ?? "draft",
          fidelityScore: data.fidelityScore,
          apsScore: data.apsScore,
          studentId: data.studentId,
        });
      } catch {
        router.push("/essays");
      } finally {
        setLoading(false);
      }
    }
    fetchEssay();
  }, [essayId, router]);

  if (loading || !essay) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-teal)]" />
      </div>
    );
  }

  return <EssayWorkspace essay={essay} studentId={profile?.id} />;
}

function EssayWorkspace({
  essay: initialEssay,
  studentId,
}: {
  essay: EssayData;
  studentId: string | undefined;
}) {
  const router = useRouter();
  const {
    content,
    setContent,
    title,
    setTitle,
    wordCount,
    status,
    isSaving,
    lastSaved,
    timeSpent,
    updateStatus,
    updateTitle,
  } = useEssay(initialEssay);

  const {
    messages,
    isLoading: aiLoading,
    error: aiError,
    sendMessage,
  } = useAIChat(initialEssay.id, studentId, {
    essayContent: content,
    essayPrompt: initialEssay.prompt ?? undefined,
    essayTitle: title,
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col -mx-4 sm:-mx-6 -my-6">
      {/* Top Bar */}
      <div className="flex items-center gap-3 border-b border-[var(--border-light)] bg-white px-4 py-2.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/essays")}
          className="shrink-0 h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Editable Title */}
        {isEditingTitle ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setIsEditingTitle(false);
              updateTitle(title);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIsEditingTitle(false);
                updateTitle(title);
              }
            }}
            className="flex-1 min-w-0 border-b-2 border-[var(--accent-teal)] bg-transparent text-sm font-semibold text-[var(--text-primary)] outline-none"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="flex-1 min-w-0 text-left text-sm font-semibold text-[var(--text-primary)] truncate hover:text-[var(--accent-teal)] transition-colors"
          >
            {title}
          </button>
        )}

        {/* Word Count */}
        <span
          className="hidden sm:block text-xs font-mono text-[var(--text-secondary)] shrink-0"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {wordCount} words
        </span>

        {/* Status */}
        <Select value={status} onValueChange={updateStatus}>
          <SelectTrigger className="h-7 w-[110px] text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>

        {/* Fidelity Badge */}
        {initialEssay.fidelityScore != null && (
          <Badge variant="outline" className="text-xs shrink-0">
            Fidelity: {initialEssay.fidelityScore}
          </Badge>
        )}

        {/* Save Indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin text-[var(--text-secondary)]" />
          ) : lastSaved ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : null}
          <span className="text-[10px] text-[var(--text-secondary)]">
            {isSaving ? "Saving..." : lastSaved ? "Saved" : ""}
          </span>
        </div>

        {/* Mobile sidebar toggle */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="sm:hidden h-8 w-8 p-0">
              <Bot className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] p-0">
            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-3 shrink-0">
                <TabsTrigger value="chat">
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-3.5 w-3.5 mr-1" />
                  History
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
                <AISidebar
                  messages={messages}
                  isLoading={aiLoading}
                  error={aiError}
                  onSend={sendMessage}
                />
              </TabsContent>
              <TabsContent
                value="history"
                className="flex-1 overflow-y-auto mt-0"
              >
                <RevisionTracker
                  essayId={initialEssay.id}
                  totalTimeSpent={timeSpent}
                />
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">
            <EssayEditor
              content={content}
              onChange={setContent}
              prompt={initialEssay.prompt}
            />
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden sm:flex w-[35%] min-w-[300px] max-w-[420px] flex-col border-l border-[var(--border-light)]">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="mx-3 mt-2 shrink-0">
              <TabsTrigger value="chat">
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-3.5 w-3.5 mr-1" />
                History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
              <AISidebar
                messages={messages}
                isLoading={aiLoading}
                error={aiError}
                onSend={sendMessage}
              />
            </TabsContent>
            <TabsContent
              value="history"
              className="flex-1 overflow-y-auto mt-0"
            >
              <RevisionTracker
                essayId={initialEssay.id}
                totalTimeSpent={timeSpent}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
