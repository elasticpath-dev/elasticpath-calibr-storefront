"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { PromoCodeInput } from "./PromoCodeInput";

type Props = {
  lang: string;
  lineCount: number;
  totalUnits: number;
};

export function CartSummaryPanel({ lang, lineCount, totalUnits }: Props) {
  const t = useTranslations("cart");
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    cartTotal,
    cartSubtotal,
    cartDiscount,
    cartDiscountAmount,
    isLoading,
  } = useCart();

  const hasDiscount = cartDiscountAmount < 0 && !!cartSubtotal;

  return (
    <div className="bg-white border border-ink-200 rounded-[16px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ink-200 bg-ink-50">
        <h2 className="font-semibold text-[15px] text-ink-900">
          {t("orderSummary")}
        </h2>
        <p className="text-[12px] text-ink-600 mt-0.5">
          {t("units", { count: totalUnits })} ·{" "}
          {t("products", { count: lineCount })}
        </p>
      </div>

      {/* Totals */}
      <div className="px-6 py-5 space-y-3">
        {hasDiscount ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-600">
                {t("subtotal")}
              </span>
              <span className="text-[13px] text-ink-600">{cartSubtotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] text-success-500">
                <Tag size={12} />
                {t("discount")}
              </span>
              <span className="text-[13px] font-semibold text-success-500">
                {cartDiscount}
              </span>
            </div>
            <div className="h-px bg-ink-200" />
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-ink-900">
                {t("total")}
              </span>
              <span className="text-[20px] font-bold text-ink-900">
                {cartTotal}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-ink-900">
              {t("total")}
            </span>
            <span className="text-[20px] font-bold text-ink-900">
              {cartTotal}
            </span>
          </div>
        )}
      </div>

      {/* Promo code */}
      <div className="px-6 pb-4 border-t border-ink-200 pt-4">
        <PromoCodeInput />
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 space-y-3">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={lineCount === 0}
          rightIcon={<ArrowRight size={16} />}
          onClick={() => router.push(`/${lang}/checkout`)}
        >
          {t("checkout")}
        </Button>

        {isAuthenticated && (
          <Button
            type="button"
            variant="outline"
            fullWidth
            disabled={lineCount === 0}
            leftIcon={<FileText size={15} />}
            onClick={() => router.push(`/${lang}/quote-request`)}
          >
            {t("requestQuote")}
          </Button>
        )}

        <p className="text-[11px] text-ink-400 text-center leading-snug">
          {t("shippingNote")}
        </p>
      </div>
    </div>
  );
}
