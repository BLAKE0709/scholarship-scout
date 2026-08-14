# Stripe go-live runbook

Test mode is fully provisioned and verified in production. This is what changes
when Scout starts taking real money.

## Blocker before any live key: Scout needs its own Stripe account

The keys currently in `.env.local` belong to **ATLAS INDUSTRIAL sandbox**
(`acct_1SvSxyBpKyLz8G2j`). Scholarship Scout is a separate venture. Running its
revenue through the Atlas account would commingle two businesses' funds in one
ledger, one payout bank account, and one 1099-K.

Harmless in test mode. Do not ship live keys from this account.

Create a Stripe account owned by Scout, then continue below.

## What is already done (test mode, verified in production)

| Piece | State |
|---|---|
| Products + prices | Created from `PLANS`; Pro $9.99/mo, $99.90/yr; Family $14.99/mo, $149.90/yr |
| `plans` table | Seeded, with Stripe price IDs written back |
| Checkout | Creates a real session; 14-day trial applied (first-time subscribers pay $0 today) |
| Webhook | Registered at `/api/webhooks/stripe`, 5 events; signature verified; forged payloads rejected with 400 |
| Webhook DB write | Proven: signed event created the subscription row and welcome notification |
| Trial expiry cron | Reachable and authenticated; runs daily at 12:00 UTC |

## Go-live steps

1. **Create the Scout Stripe account** and complete business verification
   (bank account, tax details). Payouts cannot run until this clears.

2. **Swap the keys** in `.env.local`:
   - `STRIPE_SECRET_KEY` → the live `sk_live_…`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → the live `pk_live_…`

3. **Provision the live catalog:**
   ```
   npm run stripe:setup
   ```
   It detects the live key, prints `Stripe mode: LIVE`, creates the products
   and prices in the live account, and writes the live price IDs onto the plan
   rows. It exits non-zero if any billable plan failed to resolve.

4. **Register the live webhook.** In the live dashboard, add an endpoint at
   `https://<production-domain>/api/webhooks/stripe` subscribed to exactly:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`

   Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

5. **Push the environment to Vercel** (production scope): `STRIPE_SECRET_KEY`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and
   `NEXT_PUBLIC_APP_URL` if the domain changed. Redeploy — Next.js inlines
   `NEXT_PUBLIC_*` at build time, so an env change alone does not take effect.

6. **Buy one real subscription** on the live site with a real card, confirm the
   subscription row appears and the welcome notification fires, then refund it
   from the Stripe dashboard. This is the only way to prove the live path.

## When the domain changes

`NEXT_PUBLIC_APP_URL` feeds the checkout success and cancel URLs. If it is
stale, customers complete payment and get redirected to the wrong host. Update
it, update the webhook endpoint URL, and redeploy together.

## Notes

- Prices are immutable in Stripe. Changing an amount in `PLANS` and re-running
  `stripe:setup` archives the old price and creates a new one; existing
  subscribers stay on the price they signed up at.
- The webhook returns 500 on a verified-but-failed event so Stripe retries.
  Subscription writes upsert on `userId`, so replays are safe.
