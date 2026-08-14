"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Bell, Link2, Save, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  StudentOverviewCard,
  type LinkedStudentData,
} from "@/components/parent/student-overview-card";
import { StudentLinking } from "@/components/parent/student-linking";

interface FamilyLink {
  id: string;
  studentId: string;
  status: string;
  linkMethod: string;
  createdAt: string;
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

export function ParentDashboard() {
  const { user, profile } = useUser();
  const [familyLinks, setFamilyLinks] = useState<FamilyLink[]>([]);
  const [studentData, setStudentData] = useState<
    Map<string, LinkedStudentData>
  >(new Map());
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const supabase = createClient();

  const fetchFamilyLinks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("family_links")
        .select("id, student_id, status, link_method, created_at")
        .eq("parent_id", user.id)
        .eq("status", "active");

      if (error) {
        console.error("Error fetching family links:", error);
        return;
      }

      const links: FamilyLink[] = (data ?? []).map(
        (row: Record<string, unknown>) => ({
          id: row.id as string,
          studentId: row.student_id as string,
          status: row.status as string,
          linkMethod: row.link_method as string,
          createdAt: row.created_at as string,
        }),
      );

      setFamilyLinks(links);
      return links;
    } catch (err) {
      console.error("Error fetching family links:", err);
      return [];
    }
  }, [user, supabase]);

  const fetchStudentDetails = useCallback(async (studentId: string) => {
    try {
      const response = await fetch(`/api/family/students/${studentId}`);
      if (!response.ok) {
        console.error(
          `Failed to fetch data for student ${studentId}:`,
          response.status,
        );
        return null;
      }
      const json = await response.json();
      return json.data as LinkedStudentData;
    } catch (err) {
      console.error(`Error fetching student ${studentId}:`, err);
      return null;
    }
  }, []);

  const fetchNotificationPrefs = useCallback(async () => {
    if (!user) return;

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
      // Parent profile may not exist yet - that's fine, use defaults
    }
  }, [user, supabase]);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const links = await fetchFamilyLinks();
      if (!links || links.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch details for all linked students in parallel
      const results = await Promise.all(
        links.map(async (link) => {
          const data = await fetchStudentDetails(link.studentId);
          return { studentId: link.studentId, data };
        }),
      );

      const newStudentData = new Map<string, LinkedStudentData>();
      for (const result of results) {
        if (result.data) {
          newStudentData.set(result.studentId, result.data);
        }
      }
      setStudentData(newStudentData);

      await fetchNotificationPrefs();
    } finally {
      setIsLoading(false);
    }
  }, [fetchFamilyLinks, fetchStudentDetails, fetchNotificationPrefs]);

  useEffect(() => {
    if (user && profile?.role === "parent") {
      loadDashboardData();
    }
  }, [user, profile?.role, loadDashboardData]);

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
      // Upsert parent_profiles with notification prefs
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
      </div>
    );
  }

  const activeLinks = familyLinks.filter((l) => l.status === "active");
  const hasLinkedStudents = activeLinks.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Welcome back, {profile?.fullName ?? "there"}!
          </h2>
          <p className="text-text-secondary">
            {hasLinkedStudents
              ? "Stay connected with your student's scholarship journey."
              : "Get started by linking your student's account."}
          </p>
        </div>
        {hasLinkedStudents && (
          <StudentLinking
            currentLinkCount={activeLinks.length}
            onLinkCreated={loadDashboardData}
          />
        )}
      </div>

      {/* Empty State */}
      {!hasLinkedStudents && (
        <Card className="rounded-xl border border-border-light shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-teal/10">
              <Users className="h-8 w-8 text-accent-teal" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-text-primary">
              Link Your Student
            </h3>
            <p className="mt-2 max-w-md text-center text-sm text-text-secondary">
              Connect with your student's account to follow their scholarship
              progress, upcoming deadlines, and application milestones. Your
              student will need to approve the connection.
            </p>
            <div className="mt-6">
              <StudentLinking
                currentLinkCount={0}
                onLinkCreated={loadDashboardData}
                trigger={
                  <Button className="bg-primary-navy hover:bg-primary-navy/90">
                    <Link2 className="mr-2 h-4 w-4" />
                    Link Your Student
                  </Button>
                }
              />
            </div>
            <p className="mt-4 text-xs text-text-secondary">
              Parents can see application progress and deadlines. Essay content
              and writing details remain private.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Student Cards */}
      {hasLinkedStudents && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-teal" />
            <h3 className="text-lg font-semibold text-text-primary">
              Your Students
            </h3>
          </div>
          {activeLinks.map((link) => {
            const data = studentData.get(link.studentId);
            if (!data) return null;
            return <StudentOverviewCard key={link.id} data={data} />;
          })}
        </div>
      )}

      {/* Notification Preferences */}
      {hasLinkedStudents && (
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
              const data = studentData.get(link.studentId);
              const studentName = data?.student.fullName ?? "Student";
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
                          updateStudentPref(link.studentId, "statusChanged", v)
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
                          updateStudentPref(link.studentId, "weeklySummary", v)
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
    </div>
  );
}
