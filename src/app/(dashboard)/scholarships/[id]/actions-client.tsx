"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMatches } from "@/hooks/use-matches";
import { Bookmark, X, ExternalLink, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface ScholarshipActionsProps {
  matchId: string;
  scholarshipId: string;
  applicationUrl?: string | null;
  currentStatus: string;
}

export function ScholarshipActions({
  matchId,
  scholarshipId,
  applicationUrl,
  currentStatus,
}: ScholarshipActionsProps) {
  const { saveMatch, dismissMatch, isUpdating } = useMatches();
  const router = useRouter();

  const isSaved = currentStatus === "saved";

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <Button
          className="w-full bg-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/90"
          disabled={isUpdating === matchId}
          onClick={() => router.push(`/essays?scholarship=${scholarshipId}`)}
        >
          <FileText className="mr-2 h-4 w-4" />
          Start Application
        </Button>

        <Button
          variant="outline"
          className="w-full"
          disabled={isUpdating === matchId || isSaved}
          onClick={async () => {
            await saveMatch(matchId);
            router.refresh();
          }}
        >
          <Bookmark className="mr-2 h-4 w-4" />
          {isSaved ? "Saved" : "Save"}
        </Button>

        {applicationUrl && (
          <Button variant="outline" className="w-full" asChild>
            <a href={applicationUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Visit Website
            </a>
          </Button>
        )}

        <Button
          variant="ghost"
          className="w-full text-[var(--text-secondary)] hover:text-[var(--error)]"
          disabled={isUpdating === matchId}
          onClick={async () => {
            await dismissMatch(matchId);
            router.push("/scholarships");
          }}
        >
          <X className="mr-2 h-4 w-4" />
          Dismiss
        </Button>
      </CardContent>
    </Card>
  );
}
