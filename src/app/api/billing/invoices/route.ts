import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe/client";

interface FormattedInvoice {
  id: string;
  date: string;
  description: string;
  amount: string;
  amountCents: number;
  status: string;
  invoicePdf: string | null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ invoices: [], total: 0 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10)),
  );

  const stripeInvoices = await stripe.invoices.list({
    customer: subscription.stripeCustomerId,
    limit,
    starting_after:
      page > 1
        ? (url.searchParams.get("starting_after") ?? undefined)
        : undefined,
  });

  const invoices: FormattedInvoice[] = stripeInvoices.data.map((inv) => ({
    id: inv.id,
    date: inv.created
      ? new Date(inv.created * 1000).toISOString()
      : new Date().toISOString(),
    description:
      inv.lines.data[0]?.description ?? inv.description ?? "Subscription",
    amount: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: inv.currency ?? "usd",
    }).format((inv.amount_paid ?? 0) / 100),
    amountCents: inv.amount_paid ?? 0,
    status: inv.status ?? "unknown",
    invoicePdf: inv.hosted_invoice_url ?? null,
  }));

  return NextResponse.json({
    invoices,
    total: stripeInvoices.data.length,
    hasMore: stripeInvoices.has_more,
    lastId:
      stripeInvoices.data.length > 0
        ? stripeInvoices.data[stripeInvoices.data.length - 1].id
        : null,
  });
}
