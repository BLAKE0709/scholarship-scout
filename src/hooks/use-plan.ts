"use client";

import { useQuery } from "@tanstack/react-query";
import { PLANS, type PlanFeatures, type PlanSlug } from "@/lib/billing/plans";

// ── API response shape (matches the billing status route) ────────────────────

interface BillingStatusAPIResponse {
  plan: {
    name: string;
    slug: string;
    features: Record<string, unknown>;
  };
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
}

// ── Normalized plan info exposed by the hook ─────────────────────────────────

interface PlanInfo {
  slug: PlanSlug;
  name: string;
  features: PlanFeatures;
  status: string;
  isTrial: boolean;
  currentPeriodEnd: string | null;
}

interface UsePlanReturn {
  plan: PlanInfo | null;
  features: PlanFeatures | null;
  checkFeature: (feature: keyof PlanFeatures) => boolean;
  isProOrAbove: boolean;
  isTrial: boolean;
  isLoading: boolean;
  error: Error | null;
}

function normalizePlan(data: BillingStatusAPIResponse): PlanInfo {
  const slug = (data.plan.slug as PlanSlug) ?? "free";
  const knownPlan = PLANS[slug];

  // Prefer our static plan definitions for features; fall back to DB data
  const features: PlanFeatures = knownPlan
    ? knownPlan.features
    : PLANS.free.features;

  return {
    slug,
    name: data.plan.name ?? knownPlan?.name ?? "Free",
    features,
    status: data.status ?? "active",
    isTrial: data.isTrial ?? false,
    currentPeriodEnd: data.currentPeriodEnd ?? null,
  };
}

async function fetchBillingStatus(): Promise<BillingStatusAPIResponse> {
  const res = await fetch("/api/billing/status");
  if (!res.ok) {
    throw new Error("Failed to fetch billing status");
  }
  return res.json() as Promise<BillingStatusAPIResponse>;
}

export function usePlan(): UsePlanReturn {
  const { data, isLoading, error } = useQuery<BillingStatusAPIResponse, Error>({
    queryKey: ["billing-status"],
    queryFn: fetchBillingStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const plan = data ? normalizePlan(data) : null;
  const features = plan?.features ?? null;

  const proOrAboveSlugs: PlanSlug[] = ["pro", "family", "district"];
  const isProOrAbove = plan ? proOrAboveSlugs.includes(plan.slug) : false;
  const isTrial = plan?.isTrial ?? false;

  function checkFeature(feature: keyof PlanFeatures): boolean {
    if (!features) return false;
    const value = features[feature];
    if (typeof value === "boolean") return value;
    if (value === null) return true; // null = unlimited
    if (typeof value === "number") return value > 0;
    return false;
  }

  return {
    plan,
    features,
    checkFeature,
    isProOrAbove,
    isTrial,
    isLoading,
    error: error ?? null,
  };
}
