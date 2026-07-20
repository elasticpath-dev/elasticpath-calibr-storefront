"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import type { CartLineItem } from "@/context/CartContext";

type Props = {
  items: CartLineItem[];
  cartTotal: string;
  cartTotalAmount: number;
  cartSubtotal: string;
  cartShipping: string;
  cartShippingAmount: number;
  cartTax: string;
};

export function OrderSummary({ items, cartTotal, cartTotalAmount, cartSubtotal, cartShipping, cartShippingAmount, cartTax }: Props) {
  const t = useTranslations("checkout");

  const shippingFormatted = cartShippingAmount === 0 ? t("free") : cartShipping;

  const orderTotal = cartShippingAmount > 0 && cartTotalAmount > 0
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: items[0]?.currency ?? "USD",
      }).format((cartTotalAmount + cartShippingAmount) / 100)
    : cartTotal;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          {t("orderSummary")}
          <span className="ml-2 font-normal text-gray-500">
            ({t("items", { count: items.length })})
          </span>
        </h2>
      </div>

      {/* Items */}
      <ul className="divide-y divide-gray-100">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 px-6 py-4">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-100 shrink-0">
              {item.imageHref ? (
                <Image
                  src={item.imageHref}
                  alt={item.name}
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag size={18} className="text-gray-300" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
                {item.name}
              </p>
              {item.sku && (
                <p className="mt-0.5 text-xs text-gray-400">SKU: {item.sku}</p>
              )}
              <p className="mt-0.5 text-xs text-gray-500">
                {item.unitPriceFormatted} × {item.quantity}
              </p>
            </div>

            <span className="text-sm font-semibold text-gray-900 shrink-0 self-center">
              {item.lineTotalFormatted}
            </span>
          </li>
        ))}
      </ul>

      {/* Totals */}
      <div className="px-6 py-4 border-t border-gray-100 space-y-2">
        <TotalRow label={t("subtotal")} value={cartSubtotal || cartTotal} />
        <TotalRow label={t("shipping")} value={shippingFormatted} />
        <TotalRow label={t("tax")} value={cartTax || t("included")} />
        <div className="pt-2 border-t border-gray-200">
          <TotalRow label={t("total")} value={orderTotal} bold />
        </div>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  muted = false,
  bold = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-gray-400" : "text-gray-600"}>{label}</span>
      <span
        className={
          bold
            ? "text-base font-bold text-gray-900"
            : muted
              ? "text-gray-400"
              : "font-medium text-gray-900"
        }
      >
        {value}
      </span>
    </div>
  );
}
