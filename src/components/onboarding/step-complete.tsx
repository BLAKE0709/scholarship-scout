"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, Sparkles, Zap, Loader2 } from "lucide-react";

interface StepCompleteProps {
  vaultScore: number;
  matchCount: number;
}

export function StepComplete({ vaultScore, matchCount }: StepCompleteProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trialLoading, setTrialLoading] = useState(false);

  useEffect(() => {
    // Simple CSS confetti animation via canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ["#1A9988", "#D4A843", "#0F2B46", "#E53E3E", "#4A5568"];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 1) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    let frame = 0;
    const maxFrames = 120;

    function animate() {
      if (!ctx || !canvas || frame > maxFrames) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;

        const opacity = Math.max(0, 1 - frame / maxFrames);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      frame++;
      requestAnimationFrame(animate);
    }

    animate();
  }, []);

  async function handleStartTrial() {
    setTrialLoading(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "pro", trial: true }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    }
    setTrialLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="relative space-y-8 text-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />

      <div className="relative space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-teal/10">
          <Sparkles className="h-8 w-8 text-accent-teal" />
        </div>
        <h2 className="text-3xl font-bold text-text-primary">
          Welcome to Scholarship Scout!
        </h2>
        <p className="text-text-secondary">
          Your profile is set up and we&apos;re already finding matches for you.
        </p>
      </div>

      <div className="relative mx-auto grid max-w-sm gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border-light bg-surface p-4">
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <Shield className="h-4 w-4" />
            <span className="text-sm">Vault Health</span>
          </div>
          <p className="mt-2 font-mono text-4xl font-bold text-accent-teal">
            {vaultScore}
          </p>
          <p className="text-xs text-text-secondary">out of 100</p>
        </div>
        <div className="rounded-xl border border-border-light bg-surface p-4">
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">Matches Found</span>
          </div>
          <p className="mt-2 font-mono text-4xl font-bold text-highlight-gold">
            {matchCount}
          </p>
          <p className="text-xs text-text-secondary">scholarships</p>
        </div>
      </div>

      {/* Trial Offer */}
      <div className="relative rounded-xl border border-highlight-gold/30 bg-highlight-gold/5 p-5 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-5 w-5 text-highlight-gold" />
          <p className="text-sm font-semibold text-text-primary">
            Start your 14-day Pro trial to unlock everything
          </p>
        </div>
        <p className="text-xs text-text-secondary text-center">
          Unlimited matches, AI essay assistant, deadline tracking &mdash; no
          credit card required.
        </p>
      </div>

      <div className="relative space-y-3">
        <Button
          className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white"
          size="lg"
          onClick={handleStartTrial}
          disabled={trialLoading}
        >
          {trialLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start Free Trial
        </Button>
        <Button
          variant="ghost"
          className="w-full text-text-secondary"
          onClick={() => router.push("/dashboard")}
        >
          Continue with Free Plan
        </Button>
      </div>
    </div>
  );
}
