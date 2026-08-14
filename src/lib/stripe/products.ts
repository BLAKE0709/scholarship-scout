import { stripe } from "./client";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLANS, type PlanSlug } from "@/lib/billing/plans";

/**
 * Which audience each plan is sold to, mapped to the plan_user_type enum.
 * Prices themselves are never restated here — PLANS in lib/billing/plans.ts is
 * the single source of truth, and the pricing page renders from the same map.
 */
const PLAN_USER_TYPE: Record<PlanSlug, "student" | "parent" | "institution"> = {
  free: "student",
  pro: "student",
  family: "parent",
  district: "institution",
};

/** Plans that are actually sold through Stripe Checkout. */
const BILLABLE_SLUGS: PlanSlug[] = ["pro", "family"];

/**
 * Creates the plan rows the billing code joins against. Checkout, tier
 * resolution, and the webhook all read `plans`; with the table empty every one
 * of them silently falls back to "free".
 */
export async function seedPlanRows(): Promise<void> {
  for (const slug of Object.keys(PLANS) as PlanSlug[]) {
    const plan = PLANS[slug];
    const row = {
      name: plan.name,
      slug: plan.slug,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      userType: PLAN_USER_TYPE[slug],
      features: plan.features as unknown as Record<string, unknown>,
      matchLimitMonthly: plan.features.matchLimitMonthly,
      essayLimitMonthly: plan.features.essayLimitMonthly,
      active: true,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.slug, slug))
      .limit(1);

    if (existing) {
      await db.update(plans).set(row).where(eq(plans.slug, slug));
    } else {
      await db.insert(plans).values(row);
    }
  }
}

/**
 * Idempotently creates the Stripe products and recurring prices for the
 * billable plans, then records the resulting price IDs on the plan rows.
 * Safe to re-run: products and prices are matched by metadata before creating.
 */
export async function syncProducts(): Promise<void> {
  await seedPlanRows();

  for (const slug of BILLABLE_SLUGS) {
    const plan = PLANS[slug];

    const existing = await stripe.products.search({
      query: `metadata["slug"]:"${slug}"`,
    });

    let stripeProduct = existing.data[0];

    if (!stripeProduct) {
      stripeProduct = await stripe.products.create({
        name: `Scholarship Scout ${plan.name}`,
        description: plan.description,
        metadata: { slug },
      });
    }

    const priceIds: Record<"month" | "year", string | null> = {
      month: null,
      year: null,
    };

    for (const interval of ["month", "year"] as const) {
      const amount =
        interval === "month" ? plan.priceMonthly : plan.priceYearly;
      if (!amount) continue;

      const found = await stripe.prices.search({
        query: `product:"${stripeProduct.id}" metadata["interval"]:"${interval}"`,
      });

      // A price's amount is immutable in Stripe. If the config price moved,
      // archive the stale price and mint a new one rather than silently
      // charging the old amount forever.
      const match = found.data.find(
        (p) => p.unit_amount === amount && p.active,
      );

      if (match) {
        priceIds[interval] = match.id;
        continue;
      }

      for (const stale of found.data.filter((p) => p.active)) {
        await stripe.prices.update(stale.id, { active: false });
      }

      const created = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: amount,
        currency: "usd",
        recurring: { interval },
        metadata: { interval, slug },
      });
      priceIds[interval] = created.id;
    }

    await db
      .update(plans)
      .set({
        stripePriceIdMonthly: priceIds.month,
        stripePriceIdYearly: priceIds.year,
        updatedAt: new Date(),
      })
      .where(eq(plans.slug, slug));
  }
}
