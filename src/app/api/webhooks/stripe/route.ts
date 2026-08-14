import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { handleWebhookEvent } from "@/lib/stripe/webhooks";

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );

    await handleWebhookEvent(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Stripe Webhook] Error processing event: ${message}`);
  }

  // Always return 200 to Stripe, even on errors
  return NextResponse.json({ received: true }, { status: 200 });
}
