"use client";

import Image from "next/image";
import { Package, ShoppingBag, CalendarClock, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { OrderResponse, OrderItemResponse, ShippingGroupResponse } from "@epcc-sdk/sdks-shopper";
import { DeliveryAddress } from "@/components/checkout/shipping/DeliveryAddress";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

// ─── Status helpers ───────────────────────────────────────────────────────────

export const STATUS_VARIANT: Record<string, BadgeVariant> = {
  complete: "success", incomplete: "warning", cancelled: "error", processing: "info",
};
export const PAYMENT_VARIANT: Record<string, BadgeVariant> = {
  paid: "success", unpaid: "error", authorized: "info",
  refunded: "warning", partially_paid: "warning", partially_authorized: "info",
};
export const SHIPPING_VARIANT: Record<string, BadgeVariant> = {
  fulfilled: "success", unfulfilled: "warning",
};

export function StatusBadge({ value, map }: { value?: string; map: Record<string, BadgeVariant> }) {
  if (!value) return null;
  const label = value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant={map[value] ?? "default"} dot size="sm">{label}</Badge>;
}

// ─── Date utils ───────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatDateTime(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${day} ${mon} ${year}, ${String(h).padStart(2, "0")}:${min} ${ampm}`;
}

export function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── OrderItemCard ────────────────────────────────────────────────────────────

export function OrderItemCard({ item }: { item: OrderItemResponse }) {
  const t = useTranslations("account");
  const imageHref = ((item as any).custom_inputs?.image_url as string | undefined) ?? ((item as any).image?.href as string | undefined);
  const dp = item.meta?.display_price;
  const unitPrice = dp?.with_tax?.unit?.formatted ?? dp?.without_tax?.unit?.formatted;
  const lineTotal = dp?.with_tax?.value?.formatted ?? dp?.without_tax?.value?.formatted;
  const tax = dp?.tax?.value?.amount !== 0 ? dp?.tax?.value?.formatted : undefined;
  const discount = dp?.discount?.value?.amount !== 0 ? dp?.discount?.value?.formatted : undefined;

  return (
    <div className="flex gap-3 p-4 bg-white rounded-xl border border-gray-200">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
        {imageHref ? (
          <Image src={imageHref} alt={item.name ?? ""} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={18} className="text-gray-300" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{item.name ?? "—"}</p>
        {item.sku && <p className="mt-0.5 text-xs text-gray-400 font-mono">{item.sku}</p>}
        {unitPrice && (
          <p className="mt-1 text-xs text-gray-500">{unitPrice} × {item.quantity ?? 1}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {tax && (
            <span className="text-xs text-gray-400">
              {t("itemTax")}: <span className="text-gray-600">{tax}</span>
            </span>
          )}
          {discount && (
            <span className="text-xs text-gray-400">
              {t("itemDiscount")}: <span className="text-green-600">{discount}</span>
            </span>
          )}
        </div>
      </div>

      {lineTotal && (
        <p className="text-sm font-semibold text-gray-900 shrink-0 self-center">{lineTotal}</p>
      )}
    </div>
  );
}

// ─── OrderItemsList ───────────────────────────────────────────────────────────

export function OrderItemsList({ items }: { items: OrderItemResponse[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((item) => <OrderItemCard key={item.id} item={item} />)}
    </div>
  );
}

// ─── OrderShippingGroupCard ───────────────────────────────────────────────────

export function OrderShippingGroupCard({
  group,
  groupItems,
  index,
}: {
  group: ShippingGroupResponse;
  groupItems: OrderItemResponse[];
  index: number;
}) {
  const t = useTranslations("account");

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-gray-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-800">
            {t("shippingGroup")} {index + 1}
          </span>
          {group.shipping_type && <Badge variant="outline" size="sm">{group.shipping_type}</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {group.meta?.shipping_display_price?.total?.formatted && (
            <div className="flex items-center gap-1.5">
              <Truck size={13} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500">{t("shippingCharge")}:</span>
              <span className="text-xs font-semibold text-gray-800">
                {group.meta.shipping_display_price.total.formatted}
              </span>
            </div>
          )}
          {group.tracking_reference && (
            <span className="text-xs text-gray-400 font-mono">{group.tracking_reference}</span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Shipping address */}
        {group.address && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t("shippingAddress")}
            </p>
            <DeliveryAddress address={group.address} />
          </div>
        )}

        {/* Delivery estimate */}
        {group.delivery_estimate?.end && (
          <div className="flex items-center gap-1.5">
            <CalendarClock size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500">{t("deliveryEstimate")}:</span>
            <span className="text-xs font-medium text-gray-800">
              {formatDate(group.delivery_estimate.end as unknown as string)}
            </span>
          </div>
        )}

        {/* Items */}
        {groupItems.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {t("orderItems")} ({groupItems.length})
            </p>
            <OrderItemsList items={groupItems} />
          </div>
        ) : (
          <p className="text-sm text-gray-400">{t("noItems")}</p>
        )}
      </div>
    </div>
  );
}

// ─── OrderPriceSummary ────────────────────────────────────────────────────────

export function OrderPriceSummary({ order }: { order: OrderResponse }) {
  const t = useTranslations("account");
  const dp = (order as any)?.meta?.display_price;

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("orderSummary")}</h3>
      <div className="space-y-2">
        {dp?.without_tax?.formatted && (
          <SummaryRow label={t("orderSubtotal")} value={dp.without_tax.formatted} />
        )}
        {dp?.shipping?.formatted && (
          <SummaryRow label={t("orderShippingCost")} value={dp.shipping.formatted} />
        )}
        {dp?.tax?.formatted && (
          <SummaryRow label={t("orderTax")} value={dp.tax.formatted} />
        )}
        {dp?.discount?.formatted && dp.discount.amount !== 0 && (
          <SummaryRow label={t("orderDiscount")} value={dp.discount.formatted} className="text-green-600" />
        )}
        <div className="border-t border-gray-100 pt-2 mt-2">
          <SummaryRow
            label={t("orderTotal")}
            value={dp?.with_tax?.formatted ?? dp?.without_tax?.formatted ?? "—"}
            bold
          />
        </div>
      </div>
    </div>
  );
}

// ─── OrderAddressCard ─────────────────────────────────────────────────────────

export function OrderAddressCard({
  title,
  address,
}: {
  title: string;
  address: Record<string, string | undefined>;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      <DeliveryAddress address={address} />
    </div>
  );
}

// ─── OrderItemsSection ────────────────────────────────────────────────────────

export function OrderItemsSection({
  items,
  shippingGroups,
}: {
  items: OrderItemResponse[];
  shippingGroups: ShippingGroupResponse[];
}) {
  const t = useTranslations("account");
  const hasGroups = shippingGroups.length > 0;

  const groupedItems = hasGroups
    ? shippingGroups.map((g) => items.filter((item) => (item as any).shipping_group_id === g.id))
    : [];
  const ungroupedItems = hasGroups
    ? items.filter((item) => !(item as any).shipping_group_id)
    : [];

  if (hasGroups) {
    return (
      <div className="space-y-4">
        {shippingGroups.map((group, i) => (
          <OrderShippingGroupCard key={group.id} group={group} groupItems={groupedItems[i]} index={i} />
        ))}
        {ungroupedItems.length > 0 && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t("orderItems")} ({ungroupedItems.length})
            </p>
            <OrderItemsList items={ungroupedItems} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t("orderItems")} ({items.length})
      </p>
      <OrderItemsList items={items} />
    </div>
  );
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function SummaryRow({
  label, value, bold, className,
}: {
  label: string; value: string; bold?: boolean; className?: string;
}) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className={`text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-500"}`}>{label}</span>
      <span className={`text-sm whitespace-nowrap ${bold ? "font-semibold text-gray-900" : "text-gray-700"} ${className ?? ""}`}>{value}</span>
    </div>
  );
}
