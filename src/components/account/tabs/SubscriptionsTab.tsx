"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  usePaginatedSubscriptions,
  getDisplayStatus,
} from "@/hooks/use-subscriptions";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";

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
  day:   "subscriptionFrequencyDay",
  week:  "subscriptionFrequencyWeek",
  month: "subscriptionFrequencyMonth",
  year:  "subscriptionFrequencyYear",
};

// ─── Skeleton rows ────────────────────────────────────────────────────────────

const SKELETON_ROWS = 5;

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-4">
              <Skeleton
                height={14}
                className={j === 0 ? "w-36" : j === cols - 1 ? "w-14" : "w-24"}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SubscriptionsTab() {
  const t = useTranslations("account");
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "en";

  const {
    subscriptions,
    currentPage,
    totalPages,
    isLoading,
    setPage,
  } = usePaginatedSubscriptions();

  const columns = [
    t("subscriptionColumnOffering"),
    t("subscriptionColumnStatus"),
    t("subscriptionColumnPlan"),
    t("subscriptionColumnPrice"),
    t("subscriptionColumnStarted"),
    t("subscriptionColumnNextBilling"),
    "",
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-ink-900">
          {t("tabSubscriptions")}
        </h2>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              <SkeletonRows cols={columns.length} />
            </tbody>
          </table>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-ink-400">
          <CalendarClock size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium text-ink-600">
            {t("noSubscriptions")}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto overflow-hidden rounded-xl border border-ink-200 bg-white">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-ink-50">
                <tr>
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {subscriptions.map((sub) => {
                  const ds = getDisplayStatus(sub);
                  return (
                    <tr key={sub.id} className="hover:bg-ink-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-ink-900">
                          {sub.offeringName}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={ds.variant} dot size="sm">
                          {t(ds.labelKey as any)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-ink-700 whitespace-nowrap">
                        {sub.planName ?? "—"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="block text-sm font-medium text-ink-900">
                          {sub.priceFormatted ?? "—"}
                        </span>
                        {sub.billingFrequency && FREQ_KEY[sub.billingFrequency.intervalType] && (
                          <span className="block text-xs text-ink-400">
                            {t(FREQ_KEY[sub.billingFrequency.intervalType] as any, {
                              count: sub.billingFrequency.count,
                            })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-ink-700 whitespace-nowrap">
                        {formatDate(sub.createdAt, lang) ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-ink-700 whitespace-nowrap">
                        {formatDate(sub.nextBillingAt, lang) ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/${lang}/account/subscriptions/${sub.id}`}
                          className="inline-flex items-center justify-center rounded-md border border-ink-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 shadow-sm hover:bg-ink-50 transition-colors"
                        >
                          {t("subscriptionView")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-4 justify-end"
          />
        </>
      )}
    </div>
  );
}
