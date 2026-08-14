"use client";

import { useState } from "react";
import { usePlan } from "@/hooks/use-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, X, Sparkles, Crown, Building2, Loader2 } from "lucide-react";
import {
  PLANS,
  FEATURE_DISPLAY_NAMES,
  type PlanSlug,
  type PlanFeatures,
} from "@/lib/billing/plans";

// ── Types ────────────────────────────────────────────────────────────────────

type BillingPeriod = "monthly" | "yearly";

// ── Pricing Card ─────────────────────────────────────────────────────────────

function PricingCard({
  slug,
  billingPeriod,
  currentPlanSlug,
  onCheckout,
  isCheckingOut,
}: {
  slug: PlanSlug;
  billingPeriod: BillingPeriod;
  currentPlanSlug: PlanSlug;
  onCheckout: (slug: PlanSlug, period: BillingPeriod) => void;
  isCheckingOut: boolean;
}) {
  const plan = PLANS[slug];
  const isCurrent = currentPlanSlug === slug;
  const isDistrict = slug === "district";
  const isFree = slug === "free";

  // Price display
  const monthlyPrice = plan.priceMonthly / 100;
  const yearlyMonthlyPrice = plan.priceYearly / 100 / 12;
  const displayPrice =
    billingPeriod === "yearly" && !isFree && !isDistrict
      ? yearlyMonthlyPrice
      : monthlyPrice;

  // Elevation classes
  const elevationClass =
    slug === "family"
      ? "shadow-xl hover:shadow-2xl border-[var(--accent-teal)] ring-1 ring-[var(--accent-teal)]/20"
      : slug === "pro"
        ? "shadow-lg hover:shadow-xl border-[var(--border-light)]"
        : "shadow-sm hover:shadow-md border-[var(--border-light)]";

  // Icon
  const PlanIcon =
    slug === "district"
      ? Building2
      : slug === "family"
        ? Crown
        : slug === "pro"
          ? Sparkles
          : undefined;

  // Key features to show on card
  const highlights = getCardHighlights(slug);

  return (
    <Card
      className={`relative flex flex-col rounded-2xl bg-[var(--surface)] transition-all duration-200 ${elevationClass}`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-[var(--accent-teal)] text-white px-3 py-0.5 text-xs">
            Most Popular
          </Badge>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <Badge className="bg-[var(--accent-teal)] text-white px-3 py-0.5 text-xs">
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-0">
        {PlanIcon && (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-teal)]/10 mb-2">
            <PlanIcon className="h-5 w-5 text-[var(--accent-teal)]" />
          </div>
        )}
        <CardTitle className="text-lg font-bold text-[var(--text-primary)]">
          {plan.name}
        </CardTitle>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {plan.description}
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5 pt-4">
        {/* Price */}
        <div className="text-center">
          {isDistrict ? (
            <p className="text-lg font-bold text-[var(--text-primary)]">
              Custom Pricing
            </p>
          ) : isFree ? (
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-[var(--text-primary)]">
                $0
              </span>
              <span className="text-sm text-[var(--text-secondary)]">
                /forever
              </span>
            </div>
          ) : (
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-[var(--text-primary)]">
                ${displayPrice.toFixed(2)}
              </span>
              <span className="text-sm text-[var(--text-secondary)]">/mo</span>
            </div>
          )}
          {billingPeriod === "yearly" && !isFree && !isDistrict && (
            <p className="mt-1 text-xs font-medium text-[var(--accent-teal)]">
              2 months free!
            </p>
          )}
        </div>

        {/* Feature highlights */}
        <ul className="flex-1 space-y-2.5">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-teal)]" />
              <span className="text-sm text-[var(--text-primary)]">{item}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="pt-2">
          {isCurrent ? (
            <Button
              disabled
              className="w-full bg-gray-100 text-[var(--text-secondary)] cursor-default"
            >
              Current Plan
            </Button>
          ) : isDistrict ? (
            <Button
              asChild
              variant="outline"
              className="w-full border-[var(--primary-navy)] text-[var(--primary-navy)] hover:bg-[var(--primary-navy)]/5"
            >
              <a href="mailto:sales@scholarshipscout.com?subject=District%20Plan%20Inquiry">
                Contact Us
              </a>
            </Button>
          ) : isFree ? (
            <Button
              disabled={isCurrent}
              variant="outline"
              className="w-full border-[var(--border-light)]"
            >
              Get Started Free
            </Button>
          ) : (
            <Button
              onClick={() => onCheckout(slug, billingPeriod)}
              disabled={isCheckingOut}
              className="w-full bg-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/90 text-white"
            >
              {isCheckingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Start 14-Day Trial
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Feature Comparison Table ─────────────────────────────────────────────────

const COMPARISON_FEATURES: (keyof PlanFeatures)[] = [
  "matchLimitMonthly",
  "essayLimitMonthly",
  "aiCallsPerHour",
  "documentUploads",
  "scholarshipSaveLimit",
  "vaultExport",
  "fidelityScore",
  "apsScoreFull",
  "parentLinking",
  "familyDashboard",
  "prioritySupport",
  "counselorDashboard",
  "adminAnalytics",
  "bulkStudentImport",
  "apiAccess",
];

function ComparisonValue({ value }: { value: boolean | number | null }) {
  if (value === null || value === Infinity) {
    return (
      <span className="text-sm font-medium text-[var(--accent-teal)]">
        Unlimited
      </span>
    );
  }
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-[var(--accent-teal)] mx-auto" />
    ) : (
      <X className="h-4 w-4 text-gray-300 mx-auto" />
    );
  }
  return (
    <span className="text-sm font-medium text-[var(--text-primary)]">
      {value}
    </span>
  );
}

function FeatureComparisonTable() {
  const planSlugs: PlanSlug[] = ["free", "pro", "family", "district"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-light)]">
            <th className="py-3 pr-4 text-left text-sm font-semibold text-[var(--text-primary)]">
              Feature
            </th>
            {planSlugs.map((slug) => (
              <th
                key={slug}
                className="px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)]"
              >
                {PLANS[slug].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_FEATURES.map((feature) => (
            <tr
              key={feature}
              className="border-b border-[var(--border-light)] last:border-0"
            >
              <td className="py-3 pr-4 text-sm text-[var(--text-secondary)]">
                {FEATURE_DISPLAY_NAMES[feature]}
              </td>
              {planSlugs.map((slug) => (
                <td key={slug} className="px-4 py-3 text-center">
                  <ComparisonValue value={PLANS[slug].features[feature]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Card Highlights ──────────────────────────────────────────────────────────

function getCardHighlights(slug: PlanSlug): string[] {
  switch (slug) {
    case "free":
      return [
        "5 scholarship matches/month",
        "2 essay creations/month",
        "50 AI interactions/hour",
        "3 document uploads",
        "Save up to 10 scholarships",
      ];
    case "pro":
      return [
        "Unlimited scholarship matches",
        "Unlimited essay creations",
        "200 AI interactions/hour",
        "Unlimited document uploads",
        "Fidelity Score breakdown",
        "Full APS analysis",
        "Vault export",
      ];
    case "family":
      return [
        "Everything in Pro",
        "Parent linking",
        "Family dashboard",
        "Priority support",
        "Manage multiple students",
      ];
    case "district":
      return [
        "Everything in Family",
        "Counselor dashboard",
        "Admin analytics",
        "Bulk student import",
        "API access",
        "Dedicated support",
      ];
  }
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function PricingPage() {
  const { plan: currentPlan, isLoading } = usePlan();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [checkingOutSlug, setCheckingOutSlug] = useState<PlanSlug | null>(null);

  const currentPlanSlug: PlanSlug = (currentPlan?.slug as PlanSlug) ?? "free";

  async function handleCheckout(slug: PlanSlug, period: BillingPeriod) {
    setCheckingOutSlug(slug);
    try {
      const interval = period === "yearly" ? "year" : "month";
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug: slug,
          interval,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Checkout failed");
      }

      const data = (await res.json()) as { url: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      // Surface error to user
      console.error("Checkout error:", err);
    } finally {
      setCheckingOutSlug(null);
    }
  }

  const displaySlugs: PlanSlug[] = ["free", "pro", "family"];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Find Your Perfect Plan
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Unlock the full power of Scholarship Scout to maximize your college
          funding.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span
          className={`text-sm font-medium ${
            billingPeriod === "monthly"
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          Monthly
        </span>
        <Switch
          checked={billingPeriod === "yearly"}
          onCheckedChange={(checked) =>
            setBillingPeriod(checked ? "yearly" : "monthly")
          }
        />
        <span
          className={`text-sm font-medium ${
            billingPeriod === "yearly"
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          Yearly
        </span>
        {billingPeriod === "yearly" && (
          <Badge className="bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border-0 ml-1">
            2 months free!
          </Badge>
        )}
      </div>

      {/* Plan cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-[480px] animate-pulse bg-gray-50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-start">
          {displaySlugs.map((slug) => (
            <PricingCard
              key={slug}
              slug={slug}
              billingPeriod={billingPeriod}
              currentPlanSlug={currentPlanSlug}
              onCheckout={handleCheckout}
              isCheckingOut={checkingOutSlug === slug}
            />
          ))}
        </div>
      )}

      {/* District callout */}
      <div className="mt-8 rounded-xl border border-[var(--border-light)] bg-[var(--primary-navy)]/[0.03] p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-[var(--primary-navy)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            District & Institutional Plans
          </h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-lg mx-auto">
          Manage hundreds of students with counselor dashboards, bulk import,
          admin analytics, and API access. Custom pricing for your needs.
        </p>
        <Button
          asChild
          variant="outline"
          className="border-[var(--primary-navy)] text-[var(--primary-navy)] hover:bg-[var(--primary-navy)]/5"
        >
          <a href="mailto:sales@scholarshipscout.com?subject=District%20Plan%20Inquiry">
            Contact Sales
          </a>
        </Button>
      </div>

      {/* Feature comparison */}
      <div className="mt-16">
        <h2 className="text-xl font-bold text-[var(--text-primary)] text-center mb-8">
          Compare Plans
        </h2>
        <Card className="border border-[var(--border-light)] overflow-hidden">
          <CardContent className="p-0 sm:p-6">
            <FeatureComparisonTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
