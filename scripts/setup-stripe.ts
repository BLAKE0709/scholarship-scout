/**
 * Provisions billing end to end against whichever Stripe account STRIPE_SECRET_KEY
 * points at. Idempotent — run it once for test mode, and again after swapping in
 * the live key at go-live.
 *
 *   npm run stripe:setup
 *
 * Creates the plan rows, creates/reuses the Stripe products and prices, writes
 * the price IDs back onto the plans, then prints what the app will actually use.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) {
    console.error("STRIPE_SECRET_KEY is not set in .env.local");
    process.exit(1);
  }

  const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
  console.log(`Stripe mode: ${mode}`);
  if (mode === "LIVE") {
    console.log("Provisioning against the LIVE account — real money.");
  }

  const { syncProducts } = await import("../src/lib/stripe/products");
  await syncProducts();

  const { db } = await import("../src/lib/db");
  const { plans } = await import("../src/lib/db/schema");
  const rows = await db
    .select({
      slug: plans.slug,
      name: plans.name,
      priceMonthly: plans.priceMonthly,
      priceYearly: plans.priceYearly,
      monthly: plans.stripePriceIdMonthly,
      yearly: plans.stripePriceIdYearly,
    })
    .from(plans);

  console.log("\nPlans now in the database:");
  for (const r of rows.sort((a, b) => a.priceMonthly - b.priceMonthly)) {
    const price = `$${(r.priceMonthly / 100).toFixed(2)}/mo`;
    console.log(
      `  ${r.slug.padEnd(9)} ${price.padEnd(10)} monthly=${r.monthly ?? "—"} yearly=${r.yearly ?? "—"}`,
    );
  }

  const billable = rows.filter((r) => r.slug === "pro" || r.slug === "family");
  const missing = billable.filter((r) => !r.monthly || !r.yearly);
  if (missing.length) {
    console.error(
      `\nIncomplete: ${missing.map((m) => m.slug).join(", ")} missing price IDs.`,
    );
    process.exit(1);
  }

  console.log("\nBilling is provisioned. Checkout can resolve every plan.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
