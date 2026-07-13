"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tag } from "lucide-react";
import type { CartItemDiscount } from "@/context/CartContext";

type Props = {
  discount: CartItemDiscount;
  label: string;
  className?: string;
};

export function PromoTooltip({ discount, label, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const hasTooltip = !!(discount.promotionName || discount.promotionDescription);

  const show = () => {
    if (!hasTooltip || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.top, left: r.left });
  };

  const hide = () => setPos(null);

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`flex items-center gap-1.5 cursor-default ${className}`}
      >
        <Tag size={11} className="flex-shrink-0" />
        <span className="font-medium">{label}</span>
        <span className="ml-auto font-semibold flex-shrink-0">{discount.amountFormatted}</span>
      </div>

      {pos && hasTooltip && createPortal(
        <div
          role="tooltip"
          style={{
            position: "fixed",
            top: pos.top - 8,
            left: pos.left,
            transform: "translateY(-100%)",
            zIndex: 999999,
          }}
          className="w-64 rounded-lg bg-ink-900 px-3 py-2.5 shadow-xl pointer-events-none"
        >
          {discount.promotionName && (
            <p className="text-[12px] font-semibold text-white leading-snug">{discount.promotionName}</p>
          )}
          {discount.promotionDescription && (
            <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">{discount.promotionDescription}</p>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
