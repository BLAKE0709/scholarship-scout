import { db } from "@/lib/db";
import { essays, studentProfiles, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, PenLine } from "lucide-react";
import { NewEssayDialog } from "@/components/essays/new-essay-dialog";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-50 text-blue-600",
  review: "bg-amber-50 text-amber-600",
  final: "bg-green-50 text-green-600",
};

export default async function EssaysPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const [student] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, authUser.id))
    .limit(1);

  const allEssays = student
    ? await db
        .select()
        .from(essays)
        .where(eq(essays.studentId, student.id))
        .orderBy(desc(essays.updatedAt))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary-navy)]">
            Essays
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Write and refine your scholarship essays
          </p>
        </div>
        <NewEssayDialog />
      </div>

      {allEssays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-light)] py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-teal)]/10">
            <PenLine className="h-7 w-7 text-[var(--accent-teal)]" />
          </div>
          <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
            Write Your First Essay
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
            Start crafting your scholarship essays with AI-powered assistance.
            Scout will help you brainstorm, refine, and perfect your writing.
          </p>
          <div className="mt-4">
            <NewEssayDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allEssays.map((essay) => (
            <Link key={essay.id} href={`/essays/${essay.id}`}>
              <Card className="group h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[var(--accent-teal)] shrink-0" />
                      <h3 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-teal)] transition-colors line-clamp-1">
                        {essay.title}
                      </h3>
                    </div>
                    <Badge
                      className={`text-[10px] shrink-0 capitalize ${STATUS_COLORS[essay.status ?? "draft"] ?? STATUS_COLORS.draft}`}
                    >
                      {(essay.status ?? "draft").replace("_", " ")}
                    </Badge>
                  </div>

                  {essay.prompt && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      {essay.prompt}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span className="font-mono">
                      {essay.wordCount ?? 0} words
                    </span>
                    {essay.fidelityScore != null && (
                      <span className="font-mono text-[var(--accent-teal)]">
                        Fidelity: {essay.fidelityScore}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Last edited{" "}
                    {essay.updatedAt
                      ? new Date(essay.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
