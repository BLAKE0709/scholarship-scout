"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Sparkles,
  Zap,
  FileText,
  Bell,
  Shield,
} from "lucide-react";

const planFeatures: Record<string, { title: string; features: string[] }> = {
  pro: {
    title: "Welcome to Pro!",
    features: [
      "Unlimited scholarship matches",
      "AI-powered essay assistant",
      "Deadline tracking & reminders",
      "Application progress tracking",
      "Priority support",
    ],
  },
  family: {
    title: "Welcome to Family!",
    features: [
      "Everything in Pro",
      "Monitor up to 5 students",
      "Family dashboard",
      "Shared scholarship lists",
      "Parent progress reports",
    ],
  },
  district: {
    title: "Welcome to District!",
    features: [
      "Everything in Family",
      "Unlimited students",
      "Counselor management tools",
      "District-wide analytics",
      "Custom reporting",
    ],
  },
};

const featureIcons = [Zap, FileText, Bell, Shield, Sparkles];

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const planParam = searchParams.get("plan") ?? "pro";
  const planInfo = planFeatures[planParam] ?? planFeatures.pro;

  useEffect(() => {
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

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 3,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 1) * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 7 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    let frame = 0;
    const maxFrames = 150;

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

  return (
    <div className="relative space-y-8 text-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />

      <div className="relative space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-teal/10">
          <CheckCircle className="h-8 w-8 text-accent-teal" />
        </div>
        <h2 className="text-3xl font-bold text-text-primary">
          {planInfo.title}
        </h2>
        <p className="text-text-secondary">
          Your subscription is active. Here&apos;s what you just unlocked:
        </p>
      </div>

      <div className="relative mx-auto max-w-sm space-y-3 text-left">
        {planInfo.features.map((feature, idx) => {
          const Icon = featureIcons[idx % featureIcons.length];
          return (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-lg border border-border-light bg-surface p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-teal/10">
                <Icon className="h-4 w-4 text-accent-teal" />
              </div>
              <span className="text-sm font-medium text-text-primary">
                {feature}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Button
          className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white"
          size="lg"
          onClick={() => router.push("/dashboard")}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
