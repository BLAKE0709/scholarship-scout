import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { handleWebhookEvent } from "@/lib/stripe/webhooks";

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    // Unverifiable payload — never from Stripe, so a retry would not help.
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Stripe Webhook] Signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleWebhookEvent(event);
  } catch (err) {
    // A verified event that failed to apply must NOT be acknowledged: a 200
    // here retires the event permanently and a real paid subscription would
    // never be recorded. Returning 5xx lets Stripe retry with backoff.
    // Subscription writes upsert on userId, so replays are safe.
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[Stripe Webhook] Failed to process ${event.type} (${event.id}): ${message}`,
    );
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
