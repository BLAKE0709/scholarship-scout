"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function RefreshMatches() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function refresh() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/scholarships/match", { method: "POST" });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "Could not refresh matches");
      setMessage(`${result.matchCount ?? 0} opportunities refreshed.`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not refresh matches. Try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2"><Button onClick={refresh} disabled={busy}>{busy ? "Finding funding?" : "Refresh funding matches"}</Button>{message && <p role="status" className="text-sm text-[var(--text-secondary)]">{message}</p>}</div>;
}
