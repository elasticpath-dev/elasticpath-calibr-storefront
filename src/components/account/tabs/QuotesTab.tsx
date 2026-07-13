"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { createEpClient } from "@/lib/api/ep-client";
import { getQuotes } from "@/lib/api/quotes";
import { useAuth } from "@/context/AuthContext";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteSummary = {
  id: string;
  name?: string;
  status?: string;
  createdAt?: string;
  totalFormatted?: string;
  itemCount?: number;
  contact?: { name?: string; email?: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

const QUOTE_STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft:    "default",
  pending:  "warning",
  active:   "info",
  accepted: "success",
  rejected: "error",
  expired:  "default",
};

const STATUS_KEY: Record<string, string> = {
  draft: "quoteStatusDraft",
  pending: "quoteStatusPending",
  active: "quoteStatusActive",
  accepted: "quoteStatusAccepted",
  rejected: "quoteStatusRejected",
  expired: "quoteStatusExpired",
};

function QuoteStatusBadge({ status }: { status?: string }) {
  const t = useTranslations("account");
  if (!status) return <span className="text-gray-400">—</span>;
  const key = status.toLowerCase();
  const variant = QUOTE_STATUS_VARIANT[key] ?? "default";
  const label = STATUS_KEY[key] ? t(STATUS_KEY[key] as Parameters<typeof t>[0]) : status;
  return <Badge variant={variant} dot size="sm">{label}</Badge>;
}

function mapQuote(raw: any): QuoteSummary {
  const ca = raw.custom_attributes;
  return {
    id: raw.id ?? "",
    name: raw.name ?? raw.id?.slice(0, 8).toUpperCase(),
    status: raw.quote_metadata?.status,
    createdAt: raw.meta?.timestamps?.created_at,
    totalFormatted:
      raw.meta?.display_price?.with_tax?.formatted ??
      raw.meta?.display_price?.without_tax?.formatted,
    itemCount: raw.meta?.item_count,
    contact: {
      name: ca?.buyer_name?.value,
      email: ca?.buyer_email?.value,
    },
  };
}

// ─── Main component ────────────────────────────────────────────────────────────

const SKELETON_ROWS = 4;
const COLUMNS = ["quoteColumnId", "quoteColumnDate", "quoteColumnBuyer", "quoteColumnStatus", "quoteColumnTotal", ""] as const;

export function QuotesTab() {
  const t = useTranslations("account");
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "en";

  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);
    const client = createEpClient();
    getQuotes({ client })
      .then((res: any) => {
        if (cancelled) return;
        const raw: any[] = res?.data?.data ?? [];
        setQuotes(raw.map(mapQuote));
      })
      .catch(() => { if (!cancelled) setQuotes([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">{t("tabQuotes")}</h2>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {COLUMNS.map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {col ? t(col as any) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-4"><Skeleton height={14} className="w-32" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="w-24" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="w-28" /></td>
                  <td className="px-4 py-4"><Skeleton height={20} className="w-20 rounded-full" /></td>
                  <td className="px-4 py-4"><Skeleton height={14} className="w-16" /></td>
                  <td className="px-4 py-4 w-20" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FileText size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium text-gray-500">{t("noQuotes")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {COLUMNS.map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {col ? t(col as any) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Link
                      href={`/${lang}/account/quotes/${q.id}`}
                      className="text-sm font-mono font-medium text-brand-primary hover:underline"
                    >
                      {q.name ?? q.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                    {formatDate(q.createdAt, lang)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    <span className="block">{q.contact?.name ?? "—"}</span>
                    {q.contact?.email && (
                      <span className="block text-xs text-gray-400">{q.contact.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <QuoteStatusBadge status={q.status} />
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {q.totalFormatted ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/${lang}/account/quotes/${q.id}`}
                      className="text-sm text-brand-primary hover:underline font-medium"
                    >
                      {t("viewQuote")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
