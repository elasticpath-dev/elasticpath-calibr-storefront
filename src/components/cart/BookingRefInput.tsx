"use client";

import { useState } from "react";
import { Ticket, X, Loader2, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/CartContext";
import { useTenantConfig } from "@/context/TenantConfigContext";

/**
 * Booking-reference input for the cart — mirrors PromoCodeInput. Disabled by
 * default; shown only when features.bookingRefEnabled (self-gated here so it can
 * be dropped in next to <PromoCodeInput /> without extra wiring). Applying a
 * reference POSTs to /api/booking, which calls the /v2/booking endpoint.
 */
export function BookingRefInput() {
  const t = useTranslations("cart");
  const { bookingRefEnabled } = useTenantConfig();
  const { cartId, refreshCart } = useCart();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  if (!bookingRefEnabled) return null;

  const handleApply = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setError(null);
    setApplying(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef: trimmed, cartId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setApplied(trimmed);
        setValue("");
        setOpen(false);
        // The endpoint returns the updated cart — reload it so totals/items reflect it.
        await refreshCart();
      } else {
        setError(json?.error ?? t("bookingInvalid"));
      }
    } catch {
      setError(t("bookingInvalid"));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Applied reference */}
      {applied && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-success-50 border border-success-200">
          <div className="flex items-center gap-2">
            <Ticket size={13} className="text-success-600 flex-none" />
            <span className="text-[13px] font-semibold text-success-600 tracking-wide">
              {applied}
            </span>
          </div>
          <button
            onClick={() => setApplied(null)}
            aria-label={t("bookingRemove")}
            className="p-0.5 rounded text-success-600 hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toggle link */}
      {!applied && !open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[12px] text-ink-600 hover:text-ink-900 transition-colors"
        >
          <Ticket size={12} className="flex-none" />
          {t("bookingHaveRef")}
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
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
              placeholder={t("bookingPlaceholder")}
              className="flex-1 h-9 px-3 text-[13px] border border-ink-300 rounded-lg bg-white focus:outline-none focus:border-ink-900 placeholder:text-ink-400"
            />
            <button
              onClick={handleApply}
              disabled={applying || !value.trim()}
              className="h-9 px-4 rounded-lg bg-ink-900 text-white text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {applying && <Loader2 size={13} className="animate-spin" />}
              {t("bookingApply")}
            </button>
          </div>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
