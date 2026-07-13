"use client";

import { useState, useEffect } from "react";
import { Package, Check, Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { BundleComponentItem } from "./types";

type Props = {
  cartItemId: string;
  name: string;
  sku?: string;
  slug?: string;
  lang?: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  imageUrl?: string;
  bundleComponents: BundleComponentItem[];
  onQuantityChange: (cartItemId: string, qty: number) => void;
  onRemove: (cartItemId: string) => void;
  disabled?: boolean;
};

export function BundleCartRowList({
  cartItemId,
  name,
  sku,
  slug,
  lang,
  quantity,
  unitPrice,
  lineTotal,
  imageUrl,
  bundleComponents,
  onQuantityChange,
  onRemove,
  disabled,
}: Props) {
  const t = useTranslations("cart");
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
    <article className="bg-white border border-ink-200 rounded-[16px] p-5 flex gap-5 hover:border-ink-300 transition-colors">
      {/* Image */}
      <div className="relative w-[100px] h-[100px] flex-none rounded-[12px] overflow-hidden bg-gradient-to-br from-success-100 to-warning-100 border border-ink-200 self-start flex items-center justify-center">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill sizes="100px" className="object-cover" />
        ) : (
          <Package size={28} className="text-[rgba(14,21,33,0.3)]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Name row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {slug && lang ? (
                <Link
                  href={`/${lang}/products/${slug}`}
                  className="font-semibold text-[15px] text-ink-900 leading-snug hover:text-brand-primary hover:underline transition-colors"
                >
                  {name}
                </Link>
              ) : (
                <p className="font-semibold text-[15px] text-ink-900 leading-snug">{name}</p>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-success-600 bg-success-50 border border-success-200 px-2 py-0.5 rounded-full">
                {t("bundle")}
              </span>
            </div>
            {sku && (
              <p className="text-[12px] text-ink-400 font-mono mt-0.5">{t("sku")}: {sku}</p>
            )}
          </div>
          <button
            onClick={() => onRemove(cartItemId)}
            disabled={disabled}
            aria-label={t("remove")}
            className="flex-none p-1.5 rounded-[8px] text-ink-300 hover:text-error-600 hover:bg-error-100 transition-colors disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Components */}
        <div className="rounded-[10px] border border-ink-100 divide-y divide-ink-100 overflow-hidden">
          <div className="px-3 py-1.5 bg-ink-50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              {t("whatsIncluded")}
            </p>
          </div>
          {bundleComponents.map((c, idx) => (
            <div key={idx} className="flex items-start gap-2.5 px-3 py-2.5 bg-white">
              <Check size={13} className="mt-0.5 flex-none text-success-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-ink-400 leading-none mb-0.5">{c.componentName}</p>
                <p className="text-[13px] font-semibold text-ink-900 leading-snug">{c.productName}</p>
              </div>
              <div className="flex-none flex items-center gap-1.5 text-[12px] text-ink-600 flex-wrap justify-end">
                <span className="font-bold text-success-600 bg-success-50 border border-success-200 px-1.5 py-0.5 rounded-full leading-none text-[11px]">
                  ×{c.quantity}
                </span>
                {c.unitPriceFormatted && (
                  <span>{c.unitPriceFormatted}</span>
                )}
                {c.quantity > 1 && c.lineTotalFormatted && (
                  <>
                    <span className="text-ink-300">=</span>
                    <span className="font-semibold text-ink-900">{c.lineTotalFormatted}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Unit price */}
        <p className="text-[13px] text-ink-600">
          {unitPrice} <span className="text-ink-400">{t("perKit")}</span>
        </p>

        {/* Stepper + line total */}
        <div className="mt-auto pt-1 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center rounded-[10px] border border-ink-200 overflow-hidden">
            <button
              onClick={() => onQuantityChange(cartItemId, Math.max(0, quantity - 1))}
              disabled={disabled || quantity <= 1}
              aria-label={t("decreaseQuantity")}
              className="w-9 h-9 flex items-center justify-center text-ink-600 hover:bg-ink-100 transition-colors disabled:opacity-40"
            >
              <Minus size={13} />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={draft}
              min={1}
              disabled={disabled}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commitQty(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitQty((e.target as HTMLInputElement).value); }}
              aria-label={t("quantity")}
              className="w-12 h-9 text-center text-[14px] font-semibold text-ink-900 bg-transparent border-x border-ink-200 focus:outline-none focus:border-x-success-400 disabled:opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => onQuantityChange(cartItemId, quantity + 1)}
              disabled={disabled}
              aria-label={t("increaseQuantity")}
              className="w-9 h-9 flex items-center justify-center text-ink-600 hover:bg-ink-100 transition-colors disabled:opacity-40"
            >
              <Plus size={13} />
            </button>
          </div>

          <p className="text-[17px] font-bold text-ink-900">{lineTotal}</p>
        </div>
      </div>
    </article>
  );
}
