"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { CartItemDiscount, ProductField } from "@/context/CartContext";
import { PromoTooltip } from "./PromoTooltip";
import { CartEditableFields } from "./CartEditableFields";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { editableProductFieldKeys } from "@/lib/cart-editable";

type Props = {
  cartItemId: string;
  name: string;
  sku?: string;
  slug?: string;
  lang?: string;
  quantity: number;
  unitPrice: string;
  unitPriceAmount?: number;
  lineTotal: string;
  lineTotalOriginal?: string;
  imageUrl?: string;
  discounts?: CartItemDiscount[];
  isSubscription?: boolean;
  subscriptionPlanName?: string;
  subscriptionFrequency?: string;
  isFreeGift?: boolean;
  productFields?: ProductField[];
  customInputs?: Record<string, unknown>;
  onQuantityChange: (cartItemId: string, qty: number) => void;
  onRemove: (cartItemId: string) => void;
  disabled?: boolean;
};

export function SimpleCartRowList({
  cartItemId,
  name,
  sku,
  slug,
  lang,
  quantity,
  unitPrice,
  unitPriceAmount,
  lineTotal,
  lineTotalOriginal,
  imageUrl,
  discounts,
  isSubscription,
  subscriptionPlanName,
  subscriptionFrequency,
  isFreeGift,
  productFields,
  customInputs,
  onQuantityChange,
  onRemove,
  disabled,
}: Props) {
  const t = useTranslations("cart");
  const { cartEditableInputs } = useTenantConfig();
  // Don't show a product field read-only when it's also inline-editable below.
  const editableKeys = editableProductFieldKeys(cartEditableInputs);
  const readOnlyFields = productFields?.filter((f) => !editableKeys.has(f.key));
  const [draft, setDraft] = useState(String(quantity));

  useEffect(() => {
    setDraft(String(quantity));
  }, [quantity]);

  const commitQty = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) { setDraft(String(quantity)); return; }
    if (n === quantity) { setDraft(String(quantity)); return; }
    onQuantityChange(cartItemId, n);
  };

  return (
    <div className={isSubscription || isFreeGift ? "relative mt-3" : undefined}>
      {isSubscription && (
        <div className="absolute -top-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold bg-blue-600 text-white shadow-sm">
            {t("subscription")}
          </span>
        </div>
      )}
      {isFreeGift && !isSubscription && (
        <div className="absolute -top-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold bg-success-500 text-white shadow-sm">
            {t("freeGift")}
          </span>
        </div>
      )}
    <article className={`bg-white border rounded-[16px] p-5 flex gap-5 transition-colors ${isSubscription ? "border-blue-600 hover:border-blue-700" : isFreeGift ? "border-success-500 hover:border-success-500" : "border-ink-200 hover:border-ink-300"}`}>
      {/* Image */}
      <div className="relative w-[100px] h-[100px] flex-none rounded-[12px] overflow-hidden bg-ink-100 border border-ink-200 self-start">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill sizes="100px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={28} className="text-ink-300" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Name + remove */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {slug && lang ? (
              <Link
                href={`/${lang}/products/${slug}`}
                className="block font-semibold text-[15px] text-ink-900 leading-snug hover:text-brand-primary hover:underline transition-colors"
              >
                {name}
              </Link>
            ) : (
              <p className="font-semibold text-[15px] text-ink-900 leading-snug">{name}</p>
            )}
            {sku && (
              <p className="text-[12px] text-ink-400 font-mono mt-0.5">{t("sku")}: {sku}</p>
            )}
            {isSubscription && (subscriptionPlanName || subscriptionFrequency) && (
              <p className="text-[12px] text-ink-600 mt-0.5">
                {[subscriptionPlanName, subscriptionFrequency].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          {/* Free gifts keep an invisible placeholder so columns align */}
          <button
            onClick={() => onRemove(cartItemId)}
            disabled={disabled || isFreeGift}
            aria-label={t("remove")}
            aria-hidden={isFreeGift || undefined}
            tabIndex={isFreeGift ? -1 : undefined}
            className={`flex-none p-1.5 rounded-[8px] text-ink-300 hover:text-error-600 hover:bg-error-100 transition-colors disabled:opacity-40 ${isFreeGift ? "invisible" : ""}`}
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Unit price */}
        {unitPriceAmount !== 0 && (
          <p className="text-[13px] text-ink-600">
            {unitPrice} <span className="text-ink-400">{t("perUnit")}</span>
          </p>
        )}

        {/* Discount badges */}
        {discounts?.map((d) => (
          <PromoTooltip
            key={d.promotionId}
            discount={d}
            label={d.promotionName ?? t("promotion")}
            className="text-[12px] text-green-700 w-fit"
          />
        ))}

        {/* Custom input fields (read-only; editable ones are filtered out) */}
        {readOnlyFields && readOnlyFields.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {readOnlyFields.map((f) => (
              <span key={f.key} className="text-[12px] text-ink-600">
                <span className="font-medium text-ink-700">{f.label}:</span> {f.value}
              </span>
            ))}
          </div>
        )}

        {/* Inline-editable custom inputs (ui.cartEditableInputs) */}
        <CartEditableFields
          cartItemId={cartItemId}
          quantity={quantity}
          customInputs={customInputs}
          disabled={disabled}
        />

        {/* Quantity + line total */}
        <div className="mt-auto pt-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Stepper */}
          <div className="flex items-center rounded-[10px] border border-ink-200 overflow-hidden">
            <button
              onClick={() => onQuantityChange(cartItemId, Math.max(0, quantity - 1))}
              disabled={disabled || isFreeGift || quantity <= 1}
              aria-label={t("decreaseQuantity")}
              className="w-9 h-9 flex items-center justify-center text-ink-600 hover:bg-ink-100 transition-colors disabled:opacity-40"
            >
              <Minus size={13} />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={draft}
              min={0}
              disabled={disabled || isFreeGift}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commitQty(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitQty((e.target as HTMLInputElement).value); }}
              aria-label={t("quantity")}
              className="w-12 h-9 text-center text-[14px] font-semibold text-ink-900 bg-transparent border-x border-ink-200 focus:outline-none focus:border-x-success-400 disabled:opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => onQuantityChange(cartItemId, quantity + 1)}
              disabled={disabled || isFreeGift}
              aria-label={t("increaseQuantity")}
              className="w-9 h-9 flex items-center justify-center text-ink-600 hover:bg-ink-100 transition-colors disabled:opacity-40"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Line total */}
          <div className="text-right">
            {unitPriceAmount === 0 ? (
              <p className="text-[17px] font-bold leading-none text-success-600">
                {t("free")}
              </p>
            ) : (
              <>
                {lineTotalOriginal && (
                  <p className="text-[12px] text-ink-400 line-through leading-none mb-0.5">{lineTotalOriginal}</p>
                )}
                <p className={`text-[17px] font-bold leading-none ${lineTotalOriginal ? "text-error-600" : "text-ink-900"}`}>
                  {lineTotal}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
    </div>
  );
}
