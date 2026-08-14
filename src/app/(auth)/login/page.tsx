"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mail } from "lucide-react";
import { loginSchema, magicLinkSchema } from "@/lib/validators/auth";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleEmailLogin(formData: FormData) {
    setIsLoading(true);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Check onboarding status
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profile && !profile.onboarding_completed) {
        router.push("/onboarding");
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleMagicLink(formData: FormData) {
    setIsLoading(true);
    const email = formData.get("email") as string;

    const parsed = magicLinkSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setIsLoading(false);
    toast.success("Check your email for a magic link!");
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    }
  }

  if (magicLinkSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-teal/10">
          <Mail className="h-6 w-6 text-accent-teal" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">
          Check your email
        </h2>
        <p className="text-sm text-text-secondary">
          We sent a magic link to your email. Click it to sign in.
        </p>
        <Button
          variant="ghost"
          className="text-accent-teal"
          onClick={() => {
            setMagicLinkSent(false);
            setIsMagicLink(false);
          }}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  if (isMagicLink) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold text-text-primary">
            Sign in with magic link
          </h2>
          <p className="text-sm text-text-secondary">
            We&apos;ll send you a link to sign in without a password
          </p>
        </div>
        <form action={handleMagicLink} className="space-y-4">
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
            className="w-full rounded-full bg-[#1a9988] text-white hover:bg-[#0e4f47]"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send magic link
          </Button>
        </form>
        <button
          onClick={() => setIsMagicLink(false)}
          className="w-full text-center text-sm text-accent-teal hover:underline"
        >
          Back to password sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2
          className="text-3xl font-semibold tracking-tight text-[#14312e]"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Pick up where you left off.
        </h2>
        <p className="text-sm leading-relaxed text-[#526461]">
          Sign in to review matches, deadlines, essays, and applications.
        </p>
      </div>

      <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Sign in with Google
      </Button>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-2 text-xs text-text-secondary">
          or
        </span>
      </div>

      <form action={handleEmailLogin} className="space-y-4">
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-accent-teal hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full rounded-full bg-[#1a9988] text-white hover:bg-[#0e4f47]"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <button
        onClick={() => setIsMagicLink(true)}
        className="w-full text-center text-sm text-accent-teal hover:underline"
      >
        Sign in with magic link instead
      </button>

      <p className="text-center text-sm text-[#526461]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-[#0e4f47] underline decoration-[#a97f24] decoration-2 underline-offset-4"
        >
          Start free
        </Link>
      </p>
    </div>
  );
}
