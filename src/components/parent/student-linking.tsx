"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Mail, KeyRound, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StudentLinkingProps {
  currentLinkCount: number;
  onLinkCreated: () => void;
  trigger?: React.ReactNode;
}

export function StudentLinking({
  currentLinkCount,
  onLinkCreated,
  trigger,
}: StudentLinkingProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [email, setEmail] = useState("");

  const maxStudents = 5;
  const canAddMore = currentLinkCount < maxStudents;

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!linkCode.trim()) {
      toast.error("Please enter a link code");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/family/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "code",
          identifier: linkCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Failed to submit link code");
        return;
      }

      toast.success(data.message ?? "Link request sent successfully");
      setLinkCode("");
      setOpen(false);
      onLinkCreated();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/family/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "email",
          identifier: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Failed to send link request");
        return;
      }

      toast.success(data.message ?? "Link request sent successfully");
      setEmail("");
      setOpen(false);
      onLinkCreated();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-primary-navy hover:bg-primary-navy/90">
            <Link2 className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-text-primary">
            Link a Student Account
          </DialogTitle>
          <DialogDescription>
            Connect with your student to stay updated on their scholarship
            journey. They will need to approve the connection.
          </DialogDescription>
        </DialogHeader>

        {!canAddMore ? (
          <div className="rounded-lg border border-border-light bg-bg-page p-4 text-center">
            <p className="text-sm text-text-secondary">
              You have reached the maximum of {maxStudents} linked students.
              Please unlink a student before adding another.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="code" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="code" className="flex-1">
                <KeyRound className="mr-2 h-4 w-4" />
                Link Code
              </TabsTrigger>
              <TabsTrigger value="email" className="flex-1">
                <Mail className="mr-2 h-4 w-4" />
                Invite by Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="mt-4">
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="linkCode">Enter Link Code</Label>
                  <p className="text-xs text-text-secondary">
                    Ask your student to generate a 6-character link code from
                    their account settings.
                  </p>
                  <Input
                    id="linkCode"
                    value={linkCode}
                    onChange={(e) =>
                      setLinkCode(
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 6),
                      )
                    }
                    placeholder="e.g. AB3X7K"
                    className="font-mono text-center text-lg tracking-[0.3em]"
                    maxLength={6}
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary-navy hover:bg-primary-navy/90"
                  disabled={isSubmitting || linkCode.length < 6}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  Submit Code
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="email" className="mt-4">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentEmail">Student&apos;s Email</Label>
                  <p className="text-xs text-text-secondary">
                    Enter the email address your student used to create their
                    Scholarship Scout account.
                  </p>
                  <Input
                    id="studentEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary-navy hover:bg-primary-navy/90"
                  disabled={isSubmitting || !email.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Link Request
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        <p className="mt-2 text-center text-xs text-text-secondary">
          {currentLinkCount} of {maxStudents} student slots used
        </p>
      </DialogContent>
    </Dialog>
  );
}
