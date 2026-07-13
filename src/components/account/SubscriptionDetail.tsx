"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getSubscription,
  createSubscriptionState,
  listSubscriptionInvoices,
} from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import {
  rawToSubscriptionSummary,
  getDisplayStatus,
  type SubscriptionSummary,
} from "@/hooks/use-subscriptions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

const FREQ_KEY: Record<string, string> = {
  day: "subscriptionFrequencyDay",
  week: "subscriptionFrequencyWeek",
  month: "subscriptionFrequencyMonth",
  year: "subscriptionFrequencyYear",
};

// ─── Data types ───────────────────────────────────────────────────────────────

type InvoiceSummary = {
  id: string;
  number?: number;
  periodStart?: string;
  periodEnd?: string;
  amountFormatted?: string;
  outstanding: boolean;
  createdAt?: string;
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchSubscriptionById(
  id: string,
): Promise<SubscriptionSummary | null> {
  try {
    const client = createEpClient();
    const res = await (getSubscription as any)({
      client,
      path: { subscription_uuid: id },
      query: { include: ["plans", "pricing_options"] },
    });
    const raw = res.data?.data;
    if (!raw) return null;

    const includedPlans: any[] = res.data?.included?.plans ?? [];
    const includedPOs: any[] = res.data?.included?.pricing_options ?? [];

    const plansById = new Map<string, string>(
      includedPlans.map((p: any) => [p.id as string, p.attributes?.name ?? ""]),
    );
    const pricingOptionsById = new Map<string, any>(
      includedPOs.map((p: any) => [p.id as string, p]),
    );

    return rawToSubscriptionSummary(raw, plansById, pricingOptionsById);
  } catch {
    return null;
  }
}

async function fetchInvoices(
  subscriptionId: string,
): Promise<InvoiceSummary[]> {
  if (!subscriptionId) return [];
  try {
    const client = createEpClient();
    const res = await listSubscriptionInvoices({
      client,
      path: { subscription_uuid: subscriptionId },
    });
    return ((res.data?.data ?? []) as any[]).map((inv: any): InvoiceSummary => {
      const price = inv.meta?.price;
      const amountFormatted =
        price?.amount !== undefined
          ? new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: price.currency ?? "USD",
            }).format(Number(price.amount) / 100)
          : undefined;
      return {
        id: inv.id ?? "",
        number: inv.attributes?.number ?? undefined,
        periodStart: inv.attributes?.billing_period?.start ?? undefined,
        periodEnd: inv.attributes?.billing_period?.end ?? undefined,
        amountFormatted,
        outstanding: inv.attributes?.outstanding ?? false,
        createdAt:
          inv.attributes?.created_at ??
          inv.meta?.timestamps?.created_at ??
          undefined,
      };
    });
  } catch {
    return [];
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-3">
      {children}
    </p>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-ink-600">{label}</span>
      <span className="text-sm font-medium text-ink-900 text-right">
        {children}
      </span>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-ink-200 px-5 py-4">
        <Skeleton height={24} className="w-48 mb-2" />
        <Skeleton height={14} className="w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-ink-200 p-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton height={40} className="w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton height={14} className="w-3/4" />
                  <Skeleton height={12} className="w-24" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-ink-200 p-4">
            <Skeleton height={14} className="w-20 mb-3" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={14} className="mb-2" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-ink-200 px-5 py-4">
            <Skeleton height={14} className="w-28 mb-3" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={14} className="mb-2" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SubscriptionDetail({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const t = useTranslations("account");
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "en";

  const [sub, setSub] = useState<SubscriptionSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchSubscriptionById(subscriptionId).then((result) => {
      if (!result) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      setSub(result);
      setIsLoading(false);
      fetchInvoices(subscriptionId).then(setInvoices);
    });
  }, [subscriptionId]);

  async function handleAction(action: "pause" | "resume" | "cancel") {
    if (!sub) return;
    setActingId(action);
    try {
      const client = createEpClient();
      await createSubscriptionState({
        client,
        path: { subscription_uuid: subscriptionId },
        body: { data: { type: "subscription_state", attributes: { action } } },
      });
      const updated = await fetchSubscriptionById(subscriptionId);
      setSub(updated);
    } finally {
      setActingId(null);
      setConfirmCancel(false);
    }
  }

  const isPaused = sub?.status === "paused";
  const isCanceled = sub?.status === "canceled";
  const isBusy = !!actingId;

  return (
    <div>
      {/* Top bar: back link + action buttons */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/${lang}/account/subscriptions`}
          className="flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-800 transition-colors"
        >
          <ArrowLeft size={15} />
          {t("subscriptionBackToList")}
        </Link>

        {!isLoading &&
          sub &&
          (sub.canPause || sub.canResume || sub.canCancel) && (
            <div className="flex items-center gap-2">
              {sub.canResume && !isCanceled && (
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<PlayCircle size={14} />}
                  disabled={isBusy || !isPaused}
                  isLoading={actingId === "resume"}
                  onClick={() => handleAction("resume")}
                >
                  {t("subscriptionResume")}
                </Button>
              )}
              {sub.canPause && !isCanceled && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<PauseCircle size={14} />}
                  disabled={isBusy || isPaused}
                  isLoading={actingId === "pause"}
                  className="text-warning-600 border-warning-300 hover:bg-warning-50 disabled:text-ink-400 disabled:border-ink-200"
                  onClick={() => handleAction("pause")}
                >
                  {t("subscriptionPause")}
                </Button>
              )}
              {sub.canCancel && !confirmCancel && (
                <Button
                  size="sm"
                  variant="destructive"
                  leftIcon={<XCircle size={14} />}
                  disabled={isBusy || isCanceled}
                  onClick={() => setConfirmCancel(true)}
                >
                  {t("subscriptionCancel")}
                </Button>
              )}
              {confirmCancel && (
                <>
                  <span className="text-xs text-ink-600 whitespace-nowrap">
                    {t("subscriptionCancelConfirm")}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isBusy}
                    isLoading={actingId === "cancel"}
                    onClick={() => handleAction("cancel")}
                  >
                    {t("subscriptionCancelConfirmYes")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => setConfirmCancel(false)}
                  >
                    {t("subscriptionCancelConfirmNo")}
                  </Button>
                </>
              )}
            </div>
          )}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : notFound || !sub ? (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-sm font-medium text-ink-600">
            {t("noSubscriptions")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-white rounded-xl border border-ink-200 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-ink-400 mb-0.5">
                  {t("subscriptionColumnOffering")}
                </p>
                <p className="text-lg font-semibold text-ink-900">
                  {sub.offeringName}
                </p>
                {sub.offeringDescription && (
                  <p className="text-sm text-ink-600 mt-1">
                    {sub.offeringDescription}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-ink-600">
                  {sub.createdAt && (
                    <span>
                      {t("subscriptionColumnStarted")}:{" "}
                      <span className="font-medium text-ink-700">
                        {formatDate(sub.createdAt, lang)}
                      </span>
                    </span>
                  )}
                  {sub.nextBillingAt && (
                    <span>
                      {t("subscriptionColumnNextBilling")}:{" "}
                      <span className="font-medium text-ink-700">
                        {formatDate(sub.nextBillingAt, lang)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const ds = getDisplayStatus(sub);
                  return (
                    <Badge variant={ds.variant} dot size="sm">
                      {t(ds.labelKey as any)}
                    </Badge>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Body: 2/3 main + 1/3 sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main: invoices */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-ink-200 p-4">
                <SectionHeading>{t("subscriptionInvoices")}</SectionHeading>
                {invoices === null ? (
                  <div className="overflow-hidden rounded-lg border border-ink-100">
                    <table className="min-w-full divide-y divide-ink-100">
                      <tbody className="divide-y divide-ink-100 bg-white">
                        {[0, 1, 2].map((i) => (
                          <tr key={i}>
                            {[0, 1, 2, 3].map((j) => (
                              <td key={j} className="px-4 py-3">
                                <Skeleton
                                  height={13}
                                  className={
                                    j === 0
                                      ? "w-10"
                                      : j === 1
                                        ? "w-36"
                                        : j === 2
                                          ? "w-16"
                                          : "w-16 rounded-full"
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-ink-400">
                    {t("subscriptionNoInvoices")}
                  </p>
                ) : (
                  <div className="overflow-x-auto overflow-hidden rounded-lg border border-ink-100">
                    <table className="min-w-full divide-y divide-ink-100">
                      <thead className="bg-ink-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide">
                            #
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide">
                            {t("subscriptionInvoicePeriod")}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide">
                            {t("subscriptionInvoiceAmount")}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide">
                            {t("subscriptionInvoiceStatus")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100 bg-white">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-ink-50">
                            <td className="px-4 py-3 text-sm font-mono text-ink-700 whitespace-nowrap">
                              {inv.number != null
                                ? `#${inv.number}`
                                : inv.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap">
                              {inv.periodStart && inv.periodEnd
                                ? `${formatDate(inv.periodStart, lang)} – ${formatDate(inv.periodEnd, lang)}`
                                : inv.createdAt
                                  ? formatDate(inv.createdAt, lang)
                                  : "—"}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-ink-900 whitespace-nowrap">
                              {inv.amountFormatted ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  inv.outstanding ? "warning" : "success"
                                }
                                dot
                                size="sm"
                              >
                                {inv.outstanding
                                  ? t("subscriptionInvoiceOutstanding")
                                  : t("subscriptionInvoicePaid")}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar: plan & pricing */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-ink-200 divide-y divide-ink-100">
                <div className="px-5 py-4">
                  <SectionHeading>
                    {t("subscriptionPlanDetails")}
                  </SectionHeading>
                </div>
                {sub.planName && (
                  <InfoRow label={t("subscriptionColumnPlan")}>
                    {sub.planName}
                  </InfoRow>
                )}
                {sub.pricingOptionName && (
                  <InfoRow label={t("subscriptionPricing")}>
                    {sub.pricingOptionName}
                  </InfoRow>
                )}
                {sub.priceFormatted && (
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-ink-600">
                      {t("subscriptionColumnPrice")}
                    </span>
                    <span className="text-base font-bold text-ink-900">
                      {sub.priceFormatted}
                    </span>
                  </div>
                )}
                {sub.billingFrequency &&
                  FREQ_KEY[sub.billingFrequency.intervalType] && (
                    <InfoRow label={t("subscriptionBillingFrequency")}>
                      {t(FREQ_KEY[sub.billingFrequency.intervalType] as any, {
                        count: sub.billingFrequency.count,
                      })}
                    </InfoRow>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
