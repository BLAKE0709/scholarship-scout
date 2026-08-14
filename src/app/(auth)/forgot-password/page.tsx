"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleReset(formData: FormData) {
    setIsLoading(true);
    const email = formData.get("email") as string;

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/callback?type=recovery`,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    setEmailSent(true);
    setIsLoading(false);
  }

  if (emailSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-teal/10">
          <Mail className="h-6 w-6 text-accent-teal" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">
          Check your email
        </h2>
        <p className="text-sm text-text-secondary">
          We sent a password reset link to your email address. Click the link to
          set a new password.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center text-sm text-accent-teal hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-text-primary">
          Reset your password
        </h2>
        <p className="text-sm text-text-secondary">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form action={handleReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-primary-navy hover:bg-primary-navy/90"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center text-sm text-accent-teal hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  );
}
