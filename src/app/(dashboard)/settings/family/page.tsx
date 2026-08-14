"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Link2,
  Loader2,
  Shield,
  Clock,
  Check,
  X,
  Copy,
  Bell,
  Save,
  Unlink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StudentLinking } from "@/components/parent/student-linking";

interface FamilyLinkRecord {
  id: string;
  parentId: string;
  studentId: string;
  status: "pending" | "active" | "revoked";
  linkMethod: "email" | "code";
  createdAt: string;
  // Populated via joined user data
  otherUserName: string | null;
  otherUserEmail: string | null;
}

interface NotificationPrefs {
  [studentId: string]: {
    deadlineApproaching: boolean;
    applicationSubmitted: boolean;
    statusChanged: boolean;
    weeklySummary: boolean;
  };
}

const DEFAULT_STUDENT_PREFS = {
  deadlineApproaching: true,
  applicationSubmitted: true,
  statusChanged: true,
  weeklySummary: true,
};

export default function FamilySettingsPage() {
  const { user, profile, isLoading: userLoading } = useUser();
  const [links, setLinks] = useState<FamilyLinkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [processingLinkId, setProcessingLinkId] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    {},
  );
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const supabase = createClient();

  const isStudent = profile?.role === "student";
  const isParent = profile?.role === "parent";

  const fetchLinks = useCallback(async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      // Fetch family links depending on role
      const query = supabase
        .from("family_links")
        .select("id, parent_id, student_id, status, link_method, created_at");

      if (isStudent) {
        query.eq("student_id", user.id);
      } else if (isParent) {
        query.eq("parent_id", user.id);
      }

      // Exclude revoked
      query.neq("status", "revoked");

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching links:", error);
        setIsLoading(false);
        return;
      }

      // Fetch the "other" user's name and email for each link
      const linkRecords: FamilyLinkRecord[] = [];
      for (const row of data ?? []) {
        const otherId = isStudent ? row.parent_id : row.student_id;

        const { data: otherUser } = await supabase
          .from("users")
          .select("full_name, email")
          .eq("id", otherId)
          .single();

        linkRecords.push({
          id: row.id,
          parentId: row.parent_id,
          studentId: row.student_id,
          status: row.status,
          linkMethod: row.link_method,
          createdAt: row.created_at,
          otherUserName: otherUser?.full_name ?? null,
          otherUserEmail: otherUser?.email ?? null,
        });
      }

      setLinks(linkRecords);
    } catch (err) {
      console.error("Error fetching family links:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, isStudent, isParent, supabase]);

  const fetchNotificationPrefs = useCallback(async () => {
    if (!user || !isParent) return;

    try {
      const { data } = await supabase
        .from("parent_profiles")
        .select("notification_prefs")
        .eq("user_id", user.id)
        .single();

      if (data?.notification_prefs) {
        setNotificationPrefs(data.notification_prefs as NotificationPrefs);
      }
    } catch {
      // Parent profile may not exist yet
    }
  }, [user, isParent, supabase]);

  useEffect(() => {
    if (user && profile) {
      fetchLinks();
      if (isParent) {
        fetchNotificationPrefs();
      }
    }
  }, [user, profile, fetchLinks, isParent, fetchNotificationPrefs]);

  // Countdown timer for generated code display
  useEffect(() => {
    if (codeCountdown <= 0) {
      if (generatedCode) {
        setGeneratedCode(null);
        setCodeExpiresAt(null);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCodeCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [codeCountdown, generatedCode]);

  async function handleGenerateCode() {
    setIsGeneratingCode(true);
    try {
      const response = await fetch("/api/family/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error ?? "Failed to generate link code");
        return;
      }

      setGeneratedCode(json.data.code);
      setCodeExpiresAt(json.data.expiresAt);
      setCodeCountdown(30);
      toast.success("Link code generated");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGeneratingCode(false);
    }
  }

  function copyCodeToClipboard() {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode).then(
      () => toast.success("Code copied to clipboard"),
      () => toast.error("Failed to copy code"),
    );
  }

  async function handleApproveLink(linkId: string) {
    setProcessingLinkId(linkId);
    try {
      const response = await fetch(`/api/family/link/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error ?? "Failed to approve link");
        return;
      }

      toast.success("Parent access approved");
      fetchLinks();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setProcessingLinkId(null);
    }
  }

  async function handleRejectLink(linkId: string) {
    setProcessingLinkId(linkId);
    try {
      const response = await fetch(`/api/family/link/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error ?? "Failed to decline link");
        return;
      }

      toast.success("Link request declined");
      fetchLinks();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setProcessingLinkId(null);
    }
  }

  async function handleRevokeLink(linkId: string) {
    setProcessingLinkId(linkId);
    try {
      const response = await fetch(`/api/family/link/${linkId}`, {
        method: "DELETE",
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error ?? "Failed to revoke link");
        return;
      }

      toast.success("Family link has been revoked");
      fetchLinks();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setProcessingLinkId(null);
    }
  }

  function getStudentPrefs(studentId: string) {
    return notificationPrefs[studentId] ?? { ...DEFAULT_STUDENT_PREFS };
  }

  function updateStudentPref(
    studentId: string,
    key: keyof typeof DEFAULT_STUDENT_PREFS,
    value: boolean,
  ) {
    setNotificationPrefs((prev) => ({
      ...prev,
      [studentId]: {
        ...getStudentPrefs(studentId),
        [key]: value,
      },
    }));
  }

  async function saveNotificationPrefs() {
    if (!user) return;

    setIsSavingPrefs(true);
    try {
      const { error } = await supabase.from("parent_profiles").upsert(
        {
          user_id: user.id,
          notification_prefs: notificationPrefs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        toast.error("Failed to save notification preferences");
        console.error("Error saving prefs:", error);
      } else {
        toast.success("Notification preferences saved");
      }
    } catch {
      toast.error("Something went wrong saving preferences");
    } finally {
      setIsSavingPrefs(false);
    }
  }

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
      </div>
    );
  }

  const activeLinks = links.filter((l) => l.status === "active");
  const pendingLinks = links.filter((l) => l.status === "pending");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">
          Family Connections
        </h2>
        <p className="text-text-secondary">
          Manage linked family accounts and permissions
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-accent-teal/20 bg-accent-teal/5 p-4">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent-teal" />
        <div>
          <p className="text-sm font-medium text-text-primary">
            Privacy protected
          </p>
          <p className="text-xs text-text-secondary">
            Parents can see application progress and deadlines. Essay content,
            writing details, fidelity scores, and AI interaction data remain
            private to the student.
          </p>
        </div>
      </div>

      {/* === STUDENT VIEW === */}
      {isStudent && (
        <>
          {/* Pending Requests */}
          {pendingLinks.length > 0 && (
            <Card className="rounded-xl border border-highlight-gold/30 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-highlight-gold" />
                  Pending Requests
                </CardTitle>
                <CardDescription>
                  A parent has requested to link with your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-lg border border-border-light p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {link.otherUserName ?? link.otherUserEmail ?? "Unknown"}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Requested via{" "}
                        {link.linkMethod === "code" ? "link code" : "email"}
                        {" \u00B7 "}
                        {formatDistanceToNow(new Date(link.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-accent-teal hover:bg-accent-teal/90"
                        disabled={processingLinkId === link.id}
                        onClick={() => handleApproveLink(link.id)}
                      >
                        {processingLinkId === link.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processingLinkId === link.id}
                        onClick={() => handleRejectLink(link.id)}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Linked Parents */}
          <Card className="rounded-xl border border-border-light shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent-teal" />
                Linked Parents
              </CardTitle>
              <CardDescription>
                Parents who can view your scholarship progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeLinks.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-secondary">
                  No linked parents yet. Generate a link code below to connect
                  with a parent.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-lg border border-border-light p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {link.otherUserName ??
                            link.otherUserEmail ??
                            "Parent"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Badge variant="outline" className="text-xs">
                            {link.linkMethod === "code" ? "Code" : "Email"}
                          </Badge>
                          <span>
                            Linked{" "}
                            {formatDistanceToNow(new Date(link.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-error hover:bg-error/10 hover:text-error"
                        disabled={processingLinkId === link.id}
                        onClick={() => handleRevokeLink(link.id)}
                      >
                        {processingLinkId === link.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="mr-1 h-4 w-4" />
                        )}
                        Revoke Access
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Link Code */}
          <Card className="rounded-xl border border-border-light shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-accent-teal" />
                Generate Link Code
              </CardTitle>
              <CardDescription>
                Share this code with your parent. They will enter it on their
                dashboard to request a connection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedCode && codeCountdown > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border-2 border-accent-teal/30 bg-accent-teal/5 p-6 text-center">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Your Link Code
                    </p>
                    <p className="mt-2 font-mono text-4xl font-bold tracking-[0.4em] text-primary-navy">
                      {generatedCode}
                    </p>
                    <p className="mt-2 text-xs text-text-secondary">
                      Displaying for {codeCountdown} more seconds
                      {codeExpiresAt && ` \u00B7 Valid for 24 hours`}
                    </p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyCodeToClipboard}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCode}
                      disabled={isGeneratingCode}
                    >
                      Generate New Code
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Button
                    onClick={handleGenerateCode}
                    className="bg-primary-navy hover:bg-primary-navy/90"
                    disabled={isGeneratingCode}
                  >
                    {isGeneratingCode ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Generate Link Code
                  </Button>
                  <p className="mt-2 text-xs text-text-secondary">
                    Code expires after 24 hours. Any previous unused codes will
                    be deactivated.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* === PARENT VIEW === */}
      {isParent && (
        <>
          {/* Linked Students */}
          <Card className="rounded-xl border border-border-light shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent-teal" />
                  Linked Students
                </CardTitle>
                <CardDescription>
                  Students whose scholarship progress you can follow
                </CardDescription>
              </div>
              <StudentLinking
                currentLinkCount={activeLinks.length + pendingLinks.length}
                onLinkCreated={fetchLinks}
                trigger={
                  <Button
                    size="sm"
                    className="bg-primary-navy hover:bg-primary-navy/90"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Add Student
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              {activeLinks.length === 0 && pendingLinks.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-secondary">
                  No linked students yet. Use the "Add Student" button to
                  connect with your student's account.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-lg border border-border-light p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {link.otherUserName ??
                            link.otherUserEmail ??
                            "Student"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Badge variant="outline" className="text-xs">
                            {link.linkMethod === "code" ? "Code" : "Email"}
                          </Badge>
                          <span>
                            Linked{" "}
                            {formatDistanceToNow(new Date(link.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-error hover:bg-error/10 hover:text-error"
                        disabled={processingLinkId === link.id}
                        onClick={() => handleRevokeLink(link.id)}
                      >
                        {processingLinkId === link.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="mr-1 h-4 w-4" />
                        )}
                        Unlink
                      </Button>
                    </div>
                  ))}
                  {pendingLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-lg border border-highlight-gold/30 bg-highlight-gold/5 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {link.otherUserName ??
                            link.otherUserEmail ??
                            "Student"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Badge
                            variant="secondary"
                            className="bg-highlight-gold/10 text-highlight-gold text-xs"
                          >
                            Pending
                          </Badge>
                          <span>
                            Requested{" "}
                            {formatDistanceToNow(new Date(link.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Waiting for student approval
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          {activeLinks.length > 0 && (
            <Card className="rounded-xl border border-border-light shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-accent-teal" />
                  <CardTitle>Notification Preferences</CardTitle>
                </div>
                <CardDescription>
                  Choose what updates you receive for each student
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeLinks.map((link, linkIndex) => {
                  const studentName = link.otherUserName ?? "Student";
                  const prefs = getStudentPrefs(link.studentId);

                  return (
                    <div key={link.id}>
                      {linkIndex > 0 && <Separator className="mb-6" />}
                      <h4 className="mb-4 text-sm font-semibold text-text-primary">
                        {studentName}
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">
                              Deadline Approaching
                            </Label>
                            <p className="text-xs text-text-secondary">
                              Get notified 7, 3, and 1 day before deadlines
                            </p>
                          </div>
                          <Switch
                            checked={prefs.deadlineApproaching}
                            onCheckedChange={(v) =>
                              updateStudentPref(
                                link.studentId,
                                "deadlineApproaching",
                                v,
                              )
                            }
                          />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">
                              Application Submitted
                            </Label>
                            <p className="text-xs text-text-secondary">
                              When your student submits an application
                            </p>
                          </div>
                          <Switch
                            checked={prefs.applicationSubmitted}
                            onCheckedChange={(v) =>
                              updateStudentPref(
                                link.studentId,
                                "applicationSubmitted",
                                v,
                              )
                            }
                          />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">
                              Status Changed
                            </Label>
                            <p className="text-xs text-text-secondary">
                              When an application status is updated
                            </p>
                          </div>
                          <Switch
                            checked={prefs.statusChanged}
                            onCheckedChange={(v) =>
                              updateStudentPref(
                                link.studentId,
                                "statusChanged",
                                v,
                              )
                            }
                          />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">
                              Weekly Summary
                            </Label>
                            <p className="text-xs text-text-secondary">
                              Receive a weekly overview of progress
                            </p>
                          </div>
                          <Switch
                            checked={prefs.weeklySummary}
                            onCheckedChange={(v) =>
                              updateStudentPref(
                                link.studentId,
                                "weeklySummary",
                                v,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2">
                  <Button
                    onClick={saveNotificationPrefs}
                    className="bg-primary-navy hover:bg-primary-navy/90"
                    disabled={isSavingPrefs}
                  >
                    {isSavingPrefs ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Role Not Supported */}
      {!isStudent && !isParent && (
        <Card className="rounded-xl border border-border-light shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-text-secondary">
              Family linking is available for student and parent accounts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
