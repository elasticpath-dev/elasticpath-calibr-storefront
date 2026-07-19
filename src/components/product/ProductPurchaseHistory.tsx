"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { History, X, ChevronRight, Loader2 } from "lucide-react";
import { getCustomerOrders } from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { useAuth } from "@/context/AuthContext";

type Unit = "day" | "week" | "month";

type Period = { key: string; labelKey: string; days: number; unit: Unit };

// Look-back windows offered in the drawer, each bucketed by the unit that
// keeps the row count digestible: days → daily, ~month → weekly, longer →
// monthly.
const PERIODS: Period[] = [
  { key: "7d", labelKey: "period7Days", days: 7, unit: "day" },
  { key: "30d", labelKey: "period30Days", days: 30, unit: "week" },
  { key: "3m", labelKey: "period3Months", days: 90, unit: "week" },
  { key: "6m", labelKey: "period6Months", days: 180, unit: "month" },
  { key: "1y", labelKey: "period1Year", days: 365, unit: "month" },
];

const DEFAULT_PERIOD = "30d";

type Bucket = {
  key: string;
  sortTs: number;
  unit: Unit;
  date: Date;
  units: number;
  orders: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const mondayOffset = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - mondayOffset);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bucketFor(iso: string, unit: Unit): { key: string; date: Date } | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  if (unit === "day") {
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    return { key: `d:${day.toISOString().slice(0, 10)}`, date: day };
  }
  if (unit === "week") {
    const wk = startOfWeek(d);
    return { key: `w:${wk.toISOString().slice(0, 10)}`, date: wk };
  }
  const month = new Date(d.getFullYear(), d.getMonth(), 1);
  return { key: `m:${d.getFullYear()}-${d.getMonth()}`, date: month };
}

type Props = {
  sku: string;
  lang: string;
};

/**
 * Signed-in shoppers' purchase history for this product. A "View purchase
 * history" trigger opens a drawer where the shopper picks a window (7 days →
 * 1 year); the component fetches their orders filtered by product_sku + date,
 * then aggregates into day/week/month buckets showing units and orders per
 * bucket. Renders nothing when signed out or the product has no SKU.
 */
export function ProductPurchaseHistory({ sku, lang }: Props) {
  const t = useTranslations("product");
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [periodKey, setPeriodKey] = useState(DEFAULT_PERIOD);
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);

  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[0];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isAuthenticated || !sku) return;
    let cancelled = false;
    setBuckets(null);

    const since = new Date(Date.now() - period.days * 86_400_000).toISOString();
    getCustomerOrders({
      client: createEpClient(),
      query: {
        filter: `eq(product_sku,${sku}):ge(created_at,${since})`,
        include: ["items"],
        "page[limit]": 100,
      },
    })
      .then((res: any) => {
        if (cancelled) return;
        const orders: any[] = res?.data?.data ?? [];
        const items: any[] = res?.data?.included?.items ?? [];
        const itemById = new Map(items.map((it) => [it.id, it]));

        const byBucket = new Map<string, Bucket>();
        for (const order of orders) {
          const created = order.meta?.timestamps?.created_at;
          if (!created) continue;
          const itemRefs: any[] = order.relationships?.items?.data ?? [];
          const units = itemRefs.reduce((sum, ref) => {
            const it = itemById.get(ref.id);
            return it && it.sku === sku ? sum + (it.quantity ?? 0) : sum;
          }, 0);
          if (units <= 0) continue;

          const b = bucketFor(created, period.unit);
          if (!b) continue;
          const existing = byBucket.get(b.key);
          if (existing) {
            existing.units += units;
            existing.orders += 1;
          } else {
            byBucket.set(b.key, {
              key: b.key,
              sortTs: b.date.getTime(),
              unit: period.unit,
              date: b.date,
              units,
              orders: 1,
            });
          }
        }

        setBuckets([...byBucket.values()].sort((a, b) => b.sortTs - a.sortTs));
      })
      .catch(() => {
        if (!cancelled) setBuckets([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isAuthenticated, sku, period.days, period.unit]);

  if (!isAuthenticated || !sku) return null;

  const bucketLabel = (b: Bucket): string => {
    const day = String(b.date.getDate()).padStart(2, "0");
    const mon = MONTHS[b.date.getMonth()];
    const year = b.date.getFullYear();
    if (b.unit === "day") return `${day} ${mon} ${year}`;
    if (b.unit === "week") return t("purchaseHistoryWeekOf", { date: `${day} ${mon}` });
    return `${mon} ${year}`;
  };

  const totalUnits = buckets?.reduce((s, b) => s + b.units, 0) ?? 0;
  const totalOrders = buckets?.reduce((s, b) => s + b.orders, 0) ?? 0;

  const drawer = open && (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("purchaseHistoryLabel")}
        className="fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-[9999] flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <History size={18} className="text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">
              {t("purchaseHistoryLabel")}
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label={t("purchaseHistoryClose")}
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Period selector */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriodKey(p.key)}
                aria-pressed={p.key === periodKey}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  p.key === periodKey
                    ? "bg-brand-primary text-white border-transparent"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {t(p.labelKey as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {buckets === null ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-brand-primary" />
            </div>
          ) : buckets.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-gray-500">
              {t("purchaseHistoryEmpty")}
            </p>
          ) : (
            <>
              {/* Totals summary */}
              <div className="flex items-stretch divide-x divide-gray-100 border-b border-gray-100">
                <div className="flex-1 px-6 py-4">
                  <p className="text-xs text-gray-400 uppercase tracking-widest">
                    {t("purchaseHistoryColUnits")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{totalUnits}</p>
                </div>
                <div className="flex-1 px-6 py-4">
                  <p className="text-xs text-gray-400 uppercase tracking-widest">
                    {t("purchaseHistoryColOrders")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{totalOrders}</p>
                </div>
              </div>

              {/* Per-bucket rows */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="px-6 py-2 font-medium">
                      {t("purchaseHistoryColPeriod")}
                    </th>
                    <th className="px-3 py-2 font-medium text-right">
                      {t("purchaseHistoryColUnits")}
                    </th>
                    <th className="px-6 py-2 font-medium text-right">
                      {t("purchaseHistoryColOrders")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => (
                    <tr key={b.key} className="border-t border-gray-100">
                      <td className="px-6 py-3 text-gray-800 whitespace-nowrap">
                        {bucketLabel(b)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-900">
                        {b.units}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-700">{b.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Footer link to all orders */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <Link
            href={`/${lang}/account/orders`}
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-secondary hover:underline"
          >
            {t("purchaseHistoryAllOrders")}
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <History size={16} />
        {t("purchaseHistoryView")}
      </button>

      {mounted && createPortal(drawer, document.body)}
    </div>
  );
}
