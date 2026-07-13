"use client";

import { useState } from "react";
import { Tag, X, Loader2, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/CartContext";

export function PromoCodeInput() {
  const t = useTranslations("cart");
  const { appliedPromoCodes, applyPromoCode, removePromoCode, isLoading } = useCart();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError(null);
    setApplying(true);
    const result = await applyPromoCode(trimmed);
    setApplying(false);
    if (result.success) {
      setCode("");
      setOpen(false);
    } else {
      setError(result.error ?? t("promoInvalid"));
    }
  };

  return (
    <div className="space-y-2">
      {/* Applied codes */}
      {appliedPromoCodes.filter(({ code: c }) => !c.startsWith("auto_")).map(({ id, code: appliedCode }) => (
        <div
          key={id}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-success-50 border border-success-200"
        >
          <div className="flex items-center gap-2">
            <Tag size={13} className="text-success-600 flex-none" />
            <span className="text-[13px] font-semibold text-success-600 tracking-wide">
              {appliedCode}
            </span>
          </div>
          <button
            onClick={() => removePromoCode(appliedCode)}
            disabled={isLoading}
            aria-label={t("promoRemove")}
            className="p-0.5 rounded text-success-600 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* Toggle link */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[12px] text-ink-600 hover:text-ink-900 transition-colors"
        >
          <Tag size={12} className="flex-none" />
          {t("promoHaveCode")}
          <ChevronDown size={12} className="flex-none" />
        </button>
      )}

      {/* Input row */}
      {open && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
              placeholder={t("promoPlaceholder")}
              className="flex-1 h-9 px-3 text-[13px] border border-ink-300 rounded-lg bg-white focus:outline-none focus:border-ink-900 placeholder:text-ink-400"
            />
            <button
              onClick={handleApply}
              disabled={applying || !code.trim()}
              className="h-9 px-4 rounded-lg bg-ink-900 text-white text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {applying && <Loader2 size={13} className="animate-spin" />}
              {t("promoApply")}
            </button>
          </div>
          {error && (
            <p className="text-[12px] text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
