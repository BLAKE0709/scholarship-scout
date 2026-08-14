"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Users, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";

interface LinkedStudent {
  userId: string;
  fullName: string;
  email: string;
  gradeLevel: string | null;
  schoolName: string | null;
  dateAdded: string;
}

function formatGrade(grade: string | null): string {
  if (!grade) return "N/A";
  return grade
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function CounselorStudentsPage() {
  const { user, profile, isLoading: authLoading } = useUser();
  const supabase = createClient();

  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  // Add single student
  const [addEmail, setAddEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Bulk invite
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<LinkedStudent | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  // ── Fetch linked students ──────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get links
      const { data: links } = await supabase
        .from("counselor_students")
        .select("student_id, created_at")
        .eq("counselor_id", user.id)
        .order("created_at", { ascending: false });

      if (!links || links.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentUserIds = links.map((l) => l.student_id);
      const linkDateMap = new Map<string, string>();
      for (const l of links) {
        linkDateMap.set(l.student_id, l.created_at ?? "");
      }

      // Fetch user data
      const { data: usersData } = await supabase
        .from("users")
        .select("id, email, full_name")
        .in("id", studentUserIds);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("student_profiles")
        .select("user_id, grade_level, school_name")
        .in("user_id", studentUserIds);

      const profileMap = new Map<
        string,
        { gradeLevel: string | null; schoolName: string | null }
      >();
      for (const p of profiles ?? []) {
        profileMap.set(p.user_id, {
          gradeLevel: p.grade_level,
          schoolName: p.school_name,
        });
      }

      const result: LinkedStudent[] = (usersData ?? []).map((u) => {
        const prof = profileMap.get(u.id);
        return {
          userId: u.id,
          fullName: u.full_name ?? "Unknown",
          email: u.email,
          gradeLevel: prof?.gradeLevel ?? null,
          schoolName: prof?.schoolName ?? null,
          dateAdded: linkDateMap.get(u.id) ?? "",
        };
      });

      // Sort by date added (most recent first)
      result.sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      );

      setStudents(result);
    } catch (err) {
      console.error("[CounselorStudents] fetch error:", err);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) fetchStudents();
  }, [user, fetchStudents]);

  // ── Add single student ─────────────────────────────────────────────────

  async function handleAddStudent() {
    const email = addEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Enter a student email");
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch("/api/counselor/students/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to add student");
        return;
      }

      const result = data.results?.[0];
      if (result?.success) {
        toast.success(`Added ${email}`);
        setAddEmail("");
        fetchStudents();
      } else {
        toast.error(result?.error ?? "Failed to add student");
      }
    } catch {
      toast.error("Network error adding student");
    } finally {
      setAddLoading(false);
    }
  }

  // ── Bulk invite ────────────────────────────────────────────────────────

  async function handleBulkInvite() {
    const raw = bulkEmails.trim();
    if (!raw) {
      toast.error("Enter at least one email");
      return;
    }

    const emails = raw
      .split(/[,\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error("No valid emails found");
      return;
    }

    if (emails.length > 50) {
      toast.error("Maximum 50 emails per batch");
      return;
    }

    setBulkLoading(true);
    try {
      const res = await fetch("/api/counselor/students/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to add students");
        return;
      }

      const successCount = data.summary?.success ?? 0;
      const failCount = data.summary?.failed ?? 0;

      if (successCount > 0) {
        toast.success(
          `Added ${successCount} student${successCount !== 1 ? "s" : ""}`,
        );
      }
      if (failCount > 0) {
        const failures = (data.results ?? [])
          .filter(
            (r: { success: boolean; error?: string; email: string }) =>
              !r.success,
          )
          .map(
            (r: { email: string; error?: string }) => `${r.email}: ${r.error}`,
          )
          .join(", ");
        toast.error(`${failCount} failed: ${failures}`);
      }

      setBulkEmails("");
      fetchStudents();
    } catch {
      toast.error("Network error adding students");
    } finally {
      setBulkLoading(false);
    }
  }

  // ── Remove student ─────────────────────────────────────────────────────

  function handleRemoveClick(student: LinkedStudent) {
    setRemoveTarget(student);
    setRemoveOpen(true);
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoveLoading(true);

    try {
      const res = await fetch("/api/counselor/students/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: removeTarget.userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to remove student");
        return;
      }

      toast.success(`Removed ${removeTarget.fullName}`);
      fetchStudents();
    } catch {
      toast.error("Network error removing student");
    } finally {
      setRemoveLoading(false);
      setRemoveOpen(false);
      setRemoveTarget(null);
    }
  }

  // ── Guard: auth loading ────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
      </div>
    );
  }

  if (profile?.role !== "counselor") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">Access restricted to counselors.</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">
          Manage Students
        </h2>
        <p className="text-text-secondary">
          Add, invite, and manage the students in your roster.
        </p>
      </div>

      {/* Add Student Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Single add */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-accent-teal" />
              Add Student
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="student@example.com"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddStudent();
                }}
              />
              <Button onClick={handleAddStudent} disabled={addLoading}>
                {addLoading ? "Adding..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk invite */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent-teal" />
              Bulk Invite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter comma-separated emails&#10;student1@school.edu, student2@school.edu"
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              className="mb-2 min-h-20"
            />
            <Button
              onClick={handleBulkInvite}
              disabled={bulkLoading}
              className="w-full"
            >
              {bulkLoading ? "Inviting..." : "Invite All"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-navy" />
            Your Students ({students.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-text-secondary/30 mb-3" />
              <p className="text-sm text-text-secondary">
                No students linked yet. Add students by email above.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border-light">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.userId}>
                      <TableCell className="font-medium text-text-primary">
                        {student.fullName}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {student.email}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {formatGrade(student.gradeLevel)}
                      </TableCell>
                      <TableCell className="text-text-secondary truncate max-w-[160px]">
                        {student.schoolName ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {student.dateAdded
                          ? new Date(student.dateAdded).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-error hover:text-error hover:bg-error/10"
                          onClick={() => handleRemoveClick(student)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-text-primary">
                {removeTarget?.fullName}
              </span>{" "}
              from your roster? This does not delete the student's account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveOpen(false)}
              disabled={removeLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemove}
              disabled={removeLoading}
            >
              {removeLoading ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
