"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ShoppingBag, MapPin, User, FileText, Tag, PackageOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { createEpClient } from "@/lib/api/ep-client";
import { getQuote, getQuoteItems } from "@/lib/api/quotes";
import { useAuth } from "@/context/AuthContext";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteItem = {
  id: string;
  name?: string;
  sku?: string;
  quantity?: number;
  unitPriceFormatted?: string;
  lineTotalFormatted?: string;
  imageHref?: string;
};

type CustomAttr = { type: string; value: string };

type QuoteData = {
  id: string;
  name?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  totalFormatted?: string;
  contact?: { name?: string; email?: string };
  shippingAddress?: Record<string, string>;
  customAttributes?: Record<string, CustomAttr>;
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
  if (!status) return null;
  const key = status.toLowerCase();
  const variant = QUOTE_STATUS_VARIANT[key] ?? "default";
  const label = STATUS_KEY[key] ? t(STATUS_KEY[key] as Parameters<typeof t>[0]) : status;
  return <Badge variant={variant} dot>{label}</Badge>;
}

function mapQuote(raw: any): QuoteData {
  const ca = raw.custom_attributes;
  return {
    id: raw.id ?? "",
    name: raw.name,
    status: raw.quote_metadata?.status,
    createdAt: raw.meta?.timestamps?.created_at,
    updatedAt: raw.meta?.timestamps?.updated_at,
    expiresAt: raw.meta?.timestamps?.expires_at,
    totalFormatted:
      raw.meta?.display_price?.with_tax?.formatted ??
      raw.meta?.display_price?.without_tax?.formatted,
    contact: {
      name: ca?.buyer_name?.value,
      email: ca?.buyer_email?.value,
    },
    shippingAddress: raw.shipping_address,
    customAttributes: ca,
  };
}

function mapItem(raw: any): QuoteItem {
  const dp = raw.meta?.display_price;
  return {
    id: raw.id ?? "",
    name: raw.name,
    sku: raw.sku,
    quantity: raw.quantity,
    unitPriceFormatted: dp?.unit_price?.with_tax?.formatted ?? dp?.unit_price?.without_tax?.formatted,
    lineTotalFormatted: dp?.with_tax?.value?.formatted ?? dp?.without_tax?.value?.formatted,
    imageHref: raw.image?.href,
  };
}

function attr(attrs: Record<string, CustomAttr> | undefined, key: string): string | undefined {
  return attrs?.[key]?.value || undefined;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function QuoteDetail({ quoteId }: { quoteId: string }) {
  const t = useTranslations("account");
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "en";

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);
    const client = createEpClient();
    Promise.all([
      getQuote({ client, path: { quoteId } }),
      getQuoteItems({ client, path: { quoteId } }),
    ])
      .then(([quoteRes, itemsRes]: [any, any]) => {
        if (cancelled) return;
        const raw = quoteRes?.data?.data;
        if (!raw) { setNotFound(true); return; }
        setQuote(mapQuote(raw));
        setItems((itemsRes?.data?.data ?? []).map(mapItem));
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [quoteId, isAuthenticated]);

  const ca = quote?.customAttributes;

  return (
    <div>
      {/* Back link */}
      <div className="mb-6">
        <Link
          href={`/${lang}/account/quotes`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit"
        >
          <ArrowLeft size={15} />
          {t("backToQuotes")}
        </Link>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : notFound ? (
        <div className="flex flex-col items-center justify-center py-24">
          <FileText size={36} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">{t("quoteNotFound")}</p>
        </div>
      ) : quote ? (
        <div className="space-y-6">
          {/* Quote header */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{t("quoteColumnId")}</p>
                <p className="text-lg font-semibold font-mono text-gray-900">{quote.name ?? quote.id}</p>
                {quote.createdAt && (
                  <p className="text-xs text-gray-400 mt-1">{formatDate(quote.createdAt, lang)}</p>
                )}
                {quote.expiresAt && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t("quoteExpires")}: {formatDate(quote.expiresAt, lang)}
                  </p>
                )}
              </div>
              <QuoteStatusBadge status={quote.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items — left 2/3 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{t("quoteItems")}</p>
                </div>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <PackageOpen size={28} className="mb-2 opacity-40" />
                    <p className="text-sm">{t("quoteNoItems")}</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3.5 px-5 py-3.5 border-b border-gray-100 last:border-b-0"
                    >
                      <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-none overflow-hidden">
                        {item.imageHref ? (
                          <img src={item.imageHref} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag size={18} className="text-gray-400" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name ?? "—"}</p>
                        {item.sku && <p className="text-xs text-gray-400 font-mono mt-0.5">{item.sku}</p>}
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t("quoteQty")}: {item.quantity ?? "—"}
                          {item.unitPriceFormatted && ` · ${item.unitPriceFormatted} ${t("quoteEach")}`}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {item.lineTotalFormatted ?? "—"}
                      </p>
                    </div>
                  ))
                )}
                {quote.totalFormatted && (
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm text-gray-500">{t("quoteListValue")}</span>
                    <span className="text-base font-semibold text-gray-900">{quote.totalFormatted}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details sidebar — right 1/3 */}
            <div className="space-y-4">
              {/* Contact */}
              {(quote.contact?.name || quote.contact?.email) && (
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("quoteContact")}</p>
                  <DetailRow icon={<User size={14} />} label={t("quoteContactName")} value={quote.contact.name} />
                  <DetailRow icon={<User size={14} />} label={t("quoteContactEmail")} value={quote.contact.email} />
                </div>
              )}

              {/* Request details */}
              {ca && (attr(ca, "payment_term") || attr(ca, "address")) && (
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("quoteRequestDetails")}</p>
                  <DetailRow icon={<Tag size={14} />} label={t("quoteTerms")} value={attr(ca, "payment_term")} />
                  <DetailRow icon={<MapPin size={14} />} label={t("quoteShipTo")} value={attr(ca, "address")} />
                </div>
              )}

              {/* Ship-to address (structured, when present from order address fields) */}
              {quote.shippingAddress && Object.keys(quote.shippingAddress).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("quoteShipTo")}</p>
                  <div className="flex gap-3">
                    <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-gray-800 space-y-0.5">
                      {[
                        [quote.shippingAddress.first_name, quote.shippingAddress.last_name].filter(Boolean).join(" "),
                        quote.shippingAddress.company_name,
                        quote.shippingAddress.line_1,
                        quote.shippingAddress.line_2,
                        [quote.shippingAddress.city, quote.shippingAddress.county, quote.shippingAddress.postcode].filter(Boolean).join(", "),
                        quote.shippingAddress.country,
                      ].filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
        <Skeleton height={12} className="w-16 mb-1.5" />
        <Skeleton height={24} className="w-48 mb-1" />
        <Skeleton height={12} className="w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <Skeleton height={14} className="w-20" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3.5 px-5 py-3.5 border-b border-gray-100">
              <Skeleton height={40} className="w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton height={14} className="w-3/4" />
                <Skeleton height={11} className="w-24" />
              </div>
              <Skeleton height={14} className="w-16 shrink-0 self-center" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <Skeleton height={12} className="w-24 mb-3" />
              {[0, 1].map((j) => <Skeleton key={j} height={14} className="mb-2" />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
