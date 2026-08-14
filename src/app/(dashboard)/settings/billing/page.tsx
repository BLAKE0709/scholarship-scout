"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { usePlan } from "@/hooks/use-plan";
import { PlanBadge } from "@/components/billing/plan-badge";
import { CancellationDialog } from "@/components/billing/cancellation-dialog";
import type { PlanSlug } from "@/lib/billing/plans";

interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: string;
  amountCents: number;
  status: string;
  invoicePdf: string | null;
}

interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
  hasMore: boolean;
  lastId: string | null;
}

interface BillingStatusData {
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

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="outline"
          className="bg-accent-teal/10 text-accent-teal border-accent-teal/20"
        >
          Active
        </Badge>
      );
    case "trialing":
      return (
        <Badge
          variant="outline"
          className="bg-highlight-gold/10 text-highlight-gold border-highlight-gold/20"
        >
          Trial
        </Badge>
      );
    case "past_due":
      return (
        <Badge
          variant="outline"
          className="bg-red-500/10 text-red-500 border-red-500/20"
        >
          Past Due
        </Badge>
      );
    case "canceled":
      return (
        <Badge
          variant="outline"
          className="bg-text-secondary/10 text-text-secondary border-text-secondary/20"
        >
          Canceled
        </Badge>
      );
    case "paused":
      return (
        <Badge
          variant="outline"
          className="bg-text-secondary/10 text-text-secondary border-text-secondary/20"
        >
          Paused
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function UsageMeter({
  label,
  used,
  limit,
  resetDate,
}: {
  label: string;
  used: number;
  limit: number | null;
  resetDate: string | null;
}) {
  const isUnlimited = limit === null || limit === 0;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const isWarning = !isUnlimited && percentage >= 80;
  const isExceeded = !isUnlimited && percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-primary font-medium">{label}</span>
        <span className="text-text-secondary">
          {isUnlimited ? (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-accent-teal" />
              Unlimited
            </span>
          ) : (
            <span className={isExceeded ? "text-red-500 font-medium" : ""}>
              {used} / {limit}
            </span>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={
            isExceeded
              ? "[&>[data-slot=progress-indicator]]:bg-red-500"
              : isWarning
                ? "[&>[data-slot=progress-indicator]]:bg-highlight-gold"
                : "[&>[data-slot=progress-indicator]]:bg-accent-teal"
          }
        />
      )}
      {resetDate && (
        <p className="text-xs text-text-secondary">
          Resets {format(new Date(resetDate), "MMM d, yyyy")}
        </p>
      )}
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "paid":
      return (
        <Badge
          variant="outline"
          className="bg-accent-teal/10 text-accent-teal border-accent-teal/20"
        >
          Paid
        </Badge>
      );
    case "open":
      return (
        <Badge
          variant="outline"
          className="bg-highlight-gold/10 text-highlight-gold border-highlight-gold/20"
        >
          Open
        </Badge>
      );
    case "uncollectible":
      return (
        <Badge
          variant="outline"
          className="bg-red-500/10 text-red-500 border-red-500/20"
        >
          Failed
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-text-secondary/10 text-text-secondary border-text-secondary/20"
        >
          {status}
        </Badge>
      );
  }
}

export default function BillingPage() {
  const { isLoading: userLoading } = useUser();
  const { plan, features, isTrial, isLoading: planLoading } = usePlan();

  const [billingData, setBillingData] = useState<BillingStatusData | null>(
    null,
  );
  const [billingLoading, setBillingLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceLastId, setInvoiceLastId] = useState<string | null>(null);
  const [invoiceHasMore, setInvoiceHasMore] = useState(false);
  const [invoicePage, setInvoicePage] = useState(1);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchBillingStatus = useCallback(async () => {
    setBillingLoading(true);
    const res = await fetch("/api/billing/status");
    if (res.ok) {
      const data: BillingStatusData = await res.json();
      setBillingData(data);
    }
    setBillingLoading(false);
  }, []);

  const fetchInvoices = useCallback(async (startingAfter?: string) => {
    setInvoicesLoading(true);
    const params = new URLSearchParams({ limit: "10" });
    if (startingAfter) {
      params.set("starting_after", startingAfter);
    }
    const res = await fetch(`/api/billing/invoices?${params.toString()}`);
    if (res.ok) {
      const data: InvoicesResponse = await res.json();
      setInvoices(data.invoices);
      setInvoiceHasMore(data.hasMore);
      setInvoiceLastId(data.lastId);
    }
    setInvoicesLoading(false);
  }, []);

  useEffect(() => {
    fetchBillingStatus();
    fetchInvoices();
  }, [fetchBillingStatus, fetchInvoices]);

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    if (res.ok) {
      toast.success(
        "Subscription will be canceled at the end of your billing period.",
      );
      setCancelDialogOpen(false);
      await fetchBillingStatus();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to cancel subscription");
    }
    setCancelling(false);
  }

  async function handleResubscribe() {
    setResubscribing(true);
    const res = await fetch("/api/billing/resubscribe", { method: "POST" });
    if (res.ok) {
      toast.success("Your subscription has been reactivated!");
      await fetchBillingStatus();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to resubscribe");
    }
    setResubscribing(false);
  }

  async function handleOpenPortal() {
    setPortalLoading(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url;
    } else {
      toast.error("Failed to open billing portal");
      setPortalLoading(false);
    }
  }

  function handleNextInvoicePage() {
    if (invoiceHasMore && invoiceLastId) {
      setInvoicePage((p) => p + 1);
      fetchInvoices(invoiceLastId);
    }
  }

  function handlePrevInvoicePage() {
    if (invoicePage > 1) {
      setInvoicePage(1);
      fetchInvoices();
    }
  }

  if (userLoading || planLoading || billingLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
      </div>
    );
  }

  const planSlug: PlanSlug =
    (billingData?.plan.slug as PlanSlug) ?? (plan?.slug as PlanSlug) ?? "free";
  const planName = billingData?.plan.name ?? plan?.name ?? "Free";
  const status = billingData?.status ?? "active";
  const periodEnd =
    billingData?.currentPeriodEnd ?? plan?.currentPeriodEnd ?? null;
  const cancelAtPeriodEnd = billingData?.cancelAtPeriodEnd ?? false;
  const isPaid = planSlug !== "free";

  const lostFeatures = features
    ? [
        features.matchLimitMonthly === null
          ? "Unlimited scholarship matches"
          : null,
        features.essayLimitMonthly === null ? "Unlimited essay reviews" : null,
        features.fidelityScore ? "Fidelity Score analysis" : null,
        features.apsScoreFull ? "Full APS breakdown" : null,
        features.vaultExport ? "Vault export" : null,
        features.prioritySupport ? "Priority support" : null,
        features.familyDashboard ? "Family dashboard" : null,
      ].filter((f): f is string => f !== null)
    : ["Premium matching", "AI essay assistance", "Priority support"];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">
          Billing & Subscription
        </h2>
        <p className="text-text-secondary">
          Manage your plan, payment method, and billing history
        </p>
      </div>

      {/* Section 1: Current Plan */}
      <Card className="rounded-xl border-border-light bg-surface">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-text-primary">
                Current Plan
                <PlanBadge plan={planSlug} isTrial={isTrial} />
              </CardTitle>
              <CardDescription className="mt-1">
                {planName} Plan
              </CardDescription>
            </div>
            {getStatusBadge(status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status-specific messaging */}
          {status === "trialing" && periodEnd && (
            <div className="flex items-center gap-2 rounded-lg bg-highlight-gold/5 border border-highlight-gold/20 p-3">
              <AlertCircle className="h-4 w-4 text-highlight-gold shrink-0" />
              <p className="text-sm text-text-primary">
                Trial ends{" "}
                <span className="font-medium">
                  {format(new Date(periodEnd), "MMMM d, yyyy")}
                </span>{" "}
                (
                {formatDistanceToNow(new Date(periodEnd), {
                  addSuffix: false,
                })}{" "}
                left)
              </p>
            </div>
          )}

          {status === "active" && isPaid && !cancelAtPeriodEnd && periodEnd && (
            <p className="text-sm text-text-secondary">
              Renews{" "}
              <span className="font-medium text-text-primary">
                {format(new Date(periodEnd), "MMMM d, yyyy")}
              </span>
            </p>
          )}

          {status === "past_due" && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">
                Payment failed &mdash; update your payment method to keep your
                subscription active.
              </p>
            </div>
          )}

          {(status === "canceled" || cancelAtPeriodEnd) && periodEnd && (
            <div className="flex items-center gap-2 rounded-lg bg-text-secondary/5 border border-border-light p-3">
              <AlertCircle className="h-4 w-4 text-text-secondary shrink-0" />
              <p className="text-sm text-text-primary">
                {cancelAtPeriodEnd
                  ? `Access continues until ${format(new Date(periodEnd), "MMMM d, yyyy")}. Resubscribe to keep access.`
                  : `Expired on ${format(new Date(periodEnd), "MMMM d, yyyy")}. Resubscribe to regain access.`}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-primary-navy hover:bg-primary-navy/90"
            >
              <Link href="/pricing">Change Plan</Link>
            </Button>

            {isPaid && cancelAtPeriodEnd && (
              <Button
                variant="outline"
                onClick={handleResubscribe}
                disabled={resubscribing}
                className="border-accent-teal text-accent-teal hover:bg-accent-teal/5"
              >
                {resubscribing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <RefreshCw className="mr-1 h-4 w-4" />
                Resubscribe
              </Button>
            )}

            {isPaid && !cancelAtPeriodEnd && status !== "canceled" && (
              <Button
                variant="ghost"
                className="text-text-secondary hover:text-red-500"
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Usage This Month */}
      <Card className="rounded-xl border-border-light bg-surface">
        <CardHeader>
          <CardTitle className="text-text-primary">Usage This Month</CardTitle>
          <CardDescription>
            Track your feature usage for the current billing period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <UsageMeter
            label="Scholarship Matches"
            used={0}
            limit={features?.matchLimitMonthly ?? 5}
            resetDate={periodEnd}
          />
          <UsageMeter
            label="Essay Reviews"
            used={0}
            limit={features?.essayLimitMonthly ?? 2}
            resetDate={periodEnd}
          />
          <UsageMeter
            label="AI Interactions"
            used={0}
            limit={
              features?.aiCallsPerHour === Infinity
                ? null
                : (features?.aiCallsPerHour ?? null)
            }
            resetDate={periodEnd}
          />
        </CardContent>
      </Card>

      {/* Section 3: Payment Method */}
      {isPaid && (
        <Card className="rounded-xl border-border-light bg-surface">
          <CardHeader>
            <CardTitle className="text-text-primary">Payment Method</CardTitle>
            <CardDescription>Manage your payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-page">
                  <CreditCard className="h-5 w-5 text-text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">
                    Manage your card via the Stripe portal
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPortal}
                disabled={portalLoading}
              >
                {portalLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Payment Method
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Billing History */}
      <Card className="rounded-xl border-border-light bg-surface">
        <CardHeader>
          <CardTitle className="text-text-primary">Billing History</CardTitle>
          <CardDescription>View and download past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-8 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-text-secondary/40" />
              <p className="mt-2 text-sm text-text-secondary">
                No billing history yet
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-text-primary">
                        {format(new Date(invoice.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {invoice.description}
                      </TableCell>
                      <TableCell className="text-text-primary font-medium">
                        {invoice.amount}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.invoicePdf && (
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-accent-teal hover:text-accent-teal/80"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-text-secondary">
                  Page {invoicePage}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevInvoicePage}
                    disabled={invoicePage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextInvoicePage}
                    disabled={!invoiceHasMore}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancellation Dialog */}
      <CancellationDialog
        open={cancelDialogOpen}
        planName={planName}
        features={lostFeatures}
        onConfirm={handleCancel}
        onCancel={() => setCancelDialogOpen(false)}
        isLoading={cancelling}
      />
    </div>
  );
}
