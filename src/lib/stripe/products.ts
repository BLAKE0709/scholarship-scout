import { stripe } from "./client";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface ProductDefinition {
  name: string;
  slug: string;
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
}

const PRODUCTS: ProductDefinition[] = [
  {
    name: "Scholarship Scout Pro",
    slug: "pro",
    monthlyPriceCents: 999,
    yearlyPriceCents: 9999,
  },
  {
    name: "Scholarship Scout Family",
    slug: "family",
    monthlyPriceCents: 1499,
    yearlyPriceCents: 14999,
  },
  {
    name: "Scholarship Scout District",
    slug: "district",
    monthlyPriceCents: null,
    yearlyPriceCents: null,
  },
];

export async function syncProducts(): Promise<void> {
  for (const product of PRODUCTS) {
    // Check if product already exists via metadata
    const existing = await stripe.products.search({
      query: `metadata["slug"]:"${product.slug}"`,
    });

    let stripeProduct = existing.data[0];

    if (!stripeProduct) {
      stripeProduct = await stripe.products.create({
        name: product.name,
        metadata: { slug: product.slug },
      });
    }

    let monthlyPriceId: string | null = null;
    let yearlyPriceId: string | null = null;

    if (product.monthlyPriceCents !== null) {
      // Search for existing monthly price
      const existingMonthlyPrices = await stripe.prices.search({
        query: `product:"${stripeProduct.id}" metadata["interval"]:"month"`,
      });

      if (existingMonthlyPrices.data[0]) {
        monthlyPriceId = existingMonthlyPrices.data[0].id;
      } else {
        const monthlyPrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: product.monthlyPriceCents,
          currency: "usd",
          recurring: { interval: "month" },
          metadata: { interval: "month", slug: product.slug },
        });
        monthlyPriceId = monthlyPrice.id;
      }
    }

    if (product.yearlyPriceCents !== null) {
      // Search for existing yearly price
      const existingYearlyPrices = await stripe.prices.search({
        query: `product:"${stripeProduct.id}" metadata["interval"]:"year"`,
      });

      if (existingYearlyPrices.data[0]) {
        yearlyPriceId = existingYearlyPrices.data[0].id;
      } else {
        const yearlyPrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: product.yearlyPriceCents,
          currency: "usd",
          recurring: { interval: "year" },
          metadata: { interval: "year", slug: product.slug },
        });
        yearlyPriceId = yearlyPrice.id;
      }
    }

    // Update plans table with Stripe price IDs
    await db
      .update(plans)
      .set({
        stripePriceIdMonthly: monthlyPriceId,
        stripePriceIdYearly: yearlyPriceId,
        updatedAt: new Date(),
      })
      .where(eq(plans.slug, product.slug));
  }
}
