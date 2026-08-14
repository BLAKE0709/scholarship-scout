// ── Plan Feature Definitions ─────────────────────────────────────────────────

export interface PlanFeatures {
  matchLimitMonthly: number | null; // null = unlimited
  essayLimitMonthly: number | null;
  aiCallsPerHour: number;
  vaultExport: boolean;
  fidelityScore: boolean;
  apsScoreFull: boolean;
  documentUploads: number | null;
  scholarshipSaveLimit: number | null;
  parentLinking: boolean;
  prioritySupport: boolean;
  familyDashboard: boolean;
  counselorDashboard: boolean;
  adminAnalytics: boolean;
  bulkStudentImport: boolean;
  apiAccess: boolean;
}

export type PlanSlug = "free" | "pro" | "family" | "district";

export interface PlanConfig {
  slug: PlanSlug;
  name: string;
  description: string;
  priceMonthly: number; // in cents
  priceYearly: number; // in cents
  features: PlanFeatures;
  popular?: boolean;
}

// ── Plan Definitions ─────────────────────────────────────────────────────────

const FREE_FEATURES: PlanFeatures = {
  matchLimitMonthly: 5,
  essayLimitMonthly: 2,
  aiCallsPerHour: 50,
  vaultExport: false,
  fidelityScore: false,
  apsScoreFull: false,
  documentUploads: 3,
  scholarshipSaveLimit: 10,
  parentLinking: false,
  prioritySupport: false,
  familyDashboard: false,
  counselorDashboard: false,
  adminAnalytics: false,
  bulkStudentImport: false,
  apiAccess: false,
};

const PRO_FEATURES: PlanFeatures = {
  matchLimitMonthly: null,
  essayLimitMonthly: null,
  aiCallsPerHour: 200,
  vaultExport: true,
  fidelityScore: true,
  apsScoreFull: true,
  documentUploads: null,
  scholarshipSaveLimit: null,
  parentLinking: false,
  prioritySupport: false,
  familyDashboard: false,
  counselorDashboard: false,
  adminAnalytics: false,
  bulkStudentImport: false,
  apiAccess: false,
};

const FAMILY_FEATURES: PlanFeatures = {
  ...PRO_FEATURES,
  parentLinking: true,
  prioritySupport: true,
  familyDashboard: true,
};

const DISTRICT_FEATURES: PlanFeatures = {
  matchLimitMonthly: null,
  essayLimitMonthly: null,
  aiCallsPerHour: Infinity,
  vaultExport: true,
  fidelityScore: true,
  apsScoreFull: true,
  documentUploads: null,
  scholarshipSaveLimit: null,
  parentLinking: true,
  prioritySupport: true,
  familyDashboard: true,
  counselorDashboard: true,
  adminAnalytics: true,
  bulkStudentImport: true,
  apiAccess: true,
};

export const PLANS: Record<PlanSlug, PlanConfig> = {
  free: {
    slug: "free",
    name: "Free",
    description: "Get started with scholarship matching",
    priceMonthly: 0,
    priceYearly: 0,
    features: FREE_FEATURES,
  },
  pro: {
    slug: "pro",
    name: "Pro",
    description: "Unlimited matches and AI-powered essays",
    priceMonthly: 999, // $9.99
    priceYearly: 9990, // $99.90 (2 months free)
    features: PRO_FEATURES,
    popular: true,
  },
  family: {
    slug: "family",
    name: "Family",
    description: "Everything Pro plus parent linking and family dashboard",
    priceMonthly: 1499, // $14.99
    priceYearly: 14990, // $149.90 (2 months free)
    features: FAMILY_FEATURES,
  },
  district: {
    slug: "district",
    name: "District",
    description: "Enterprise features for schools and districts",
    priceMonthly: 0, // custom pricing
    priceYearly: 0,
    features: DISTRICT_FEATURES,
  },
} as const;

// ── Feature Display Names ────────────────────────────────────────────────────

export const FEATURE_DISPLAY_NAMES: Record<keyof PlanFeatures, string> = {
  matchLimitMonthly: "Scholarship Matches",
  essayLimitMonthly: "Essay Creations",
  aiCallsPerHour: "AI Interactions per Hour",
  vaultExport: "Vault Export",
  fidelityScore: "Fidelity Score",
  apsScoreFull: "Full APS Breakdown",
  documentUploads: "Document Uploads",
  scholarshipSaveLimit: "Saved Scholarships",
  parentLinking: "Parent Linking",
  prioritySupport: "Priority Support",
  familyDashboard: "Family Dashboard",
  counselorDashboard: "Counselor Dashboard",
  adminAnalytics: "Admin Analytics",
  bulkStudentImport: "Bulk Student Import",
  apiAccess: "API Access",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getPlanBySlug(slug: string): PlanConfig | undefined {
  return PLANS[slug as PlanSlug];
}

export function formatFeatureValue(
  feature: keyof PlanFeatures,
  value: boolean | number | null,
): string {
  if (value === null) return "Unlimited";
  if (typeof value === "boolean") return value ? "Included" : "Not included";
  if (value === Infinity) return "Unlimited";
  return String(value);
}

export function isPlanAtLeast(
  currentSlug: PlanSlug,
  requiredSlug: PlanSlug,
): boolean {
  const order: PlanSlug[] = ["free", "pro", "family", "district"];
  return order.indexOf(currentSlug) >= order.indexOf(requiredSlug);
}

/** Returns the minimum plan slug required to access a given boolean feature */
export function minimumPlanForFeature(feature: keyof PlanFeatures): PlanSlug {
  const order: PlanSlug[] = ["free", "pro", "family", "district"];
  for (const slug of order) {
    const value = PLANS[slug].features[feature];
    if (value === true || value === null || value === Infinity) {
      return slug;
    }
  }
  return "district";
}
