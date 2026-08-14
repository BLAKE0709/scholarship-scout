"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { profile, isLoading: userLoading } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);

  async function handleSaveProfile(formData: FormData) {
    setIsSaving(true);
    const fullName = formData.get("fullName") as string;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated");
    }

    setIsSaving(false);
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
        <p className="text-text-secondary">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Information */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={profile?.fullName ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email ?? ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-text-secondary">
                Email cannot be changed here. Contact support for assistance.
              </p>
            </div>
            <Button
              type="submit"
              className="bg-primary-navy hover:bg-primary-navy/90"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose what notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-text-secondary">
                Receive updates via email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Deadline Reminders</p>
              <p className="text-xs text-text-secondary">
                Get reminded before scholarship deadlines
              </p>
            </div>
            <Switch
              checked={deadlineReminders}
              onCheckedChange={setDeadlineReminders}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New Match Alerts</p>
              <p className="text-xs text-text-secondary">
                Get notified when new scholarships match your profile
              </p>
            </div>
            <Switch checked={matchAlerts} onCheckedChange={setMatchAlerts} />
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline">Change Password</Button>
          <div>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
            <p className="mt-1 text-xs text-text-secondary">
              This action is irreversible. All your data will be permanently
              deleted.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
