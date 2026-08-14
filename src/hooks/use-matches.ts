"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function useMatches() {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const supabase = createClient();

  const saveMatch = useCallback(
    async (matchId: string) => {
      setIsUpdating(matchId);
      const { error } = await supabase
        .from("matches")
        .update({ status: "saved", updated_at: new Date().toISOString() })
        .eq("id", matchId);

      setIsUpdating(null);
      if (error) {
        toast.error("Failed to save scholarship");
        return false;
      }
      toast.success("Scholarship saved!");
      return true;
    },
    [supabase],
  );

  const dismissMatch = useCallback(
    async (matchId: string) => {
      setIsUpdating(matchId);
      const { error } = await supabase
        .from("matches")
        .update({ status: "dismissed", updated_at: new Date().toISOString() })
        .eq("id", matchId);

      setIsUpdating(null);
      if (error) {
        toast.error("Failed to dismiss scholarship");
        return false;
      }
      toast.success("Scholarship dismissed");
      return true;
    },
    [supabase],
  );

  const updateMatchStatus = useCallback(
    async (matchId: string, status: string) => {
      setIsUpdating(matchId);
      const { error } = await supabase
        .from("matches")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", matchId);

      setIsUpdating(null);
      if (error) {
        toast.error("Failed to update status");
        return false;
      }
      return true;
    },
    [supabase],
  );

  return { saveMatch, dismissMatch, updateMatchStatus, isUpdating };
}
