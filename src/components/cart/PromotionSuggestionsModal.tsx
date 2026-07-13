"use client";

import { usePathname } from "next/navigation";
import { X, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/Button";
import { PromotionCarousel } from "./PromotionCarousel";

export function PromotionSuggestionsModal({ lang }: { lang: string }) {
  const { promotionSuggestions, showPromotionModal, dismissPromotionModal } = useCart();
  const t = useTranslations("cart");
  const pathname = usePathname();

  // Suppress on the cart page — carousel is shown inline there instead
  const isCartPage = pathname?.endsWith("/cart");
  if (!showPromotionModal || !promotionSuggestions?.length || isCartPage) return null;

  const dismiss = dismissPromotionModal;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={dismiss}
        aria-hidden="true"
      />
      <div className="relative bg-white w-full sm:max-w-6xl rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-brand-primary flex-shrink-0" />
            <h2 className="text-base font-semibold text-gray-900">
              {t("promotionModalTitle")}
            </h2>
          </div>
          <button
            onClick={dismiss}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={t("promotionModalDismiss")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <PromotionCarousel suggestions={promotionSuggestions} lang={lang} />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <Button variant="outline" className="w-full" onClick={dismiss}>
            {t("promotionModalDismiss")}
          </Button>
        </div>

      </div>
    </div>
  );
}
