"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { QuantitySelector } from "./QuantitySelector";
import { AddToCart } from "./AddToCart";
import type { ProductField } from "@/context/CartContext";

type Props = {
  productId: string;
  customInputs?: Record<string, string>;
  productFields?: ProductField[];
  onBeforeAdd?: () => boolean;
  /** Denser sizing for tight spaces like product cards — smaller Add to Cart button instead of the full-width PDP style. */
  compact?: boolean;
  /**
   * The product has no price in the active price book — disables the whole
   * control and explains why via a hover tooltip (same styling as
   * VariantAddToCart's "select all options" tooltip).
   */
  missingPrice?: boolean;
  /**
   * Card layout: rendered on the first row next to the quantity selector
   * (typically the Price), pushing the Add to Cart button onto its own
   * full-width second row.
   */
  priceSlot?: ReactNode;
};

export function QuantityAddToCart({
  productId,
  customInputs,
  productFields,
  onBeforeAdd,
  compact = false,
  missingPrice = false,
  priceSlot,
}: Props) {
  const t = useTranslations("product");
  const [quantity, setQuantity] = useState(1);

  const selector = (
    <QuantitySelector
      value={quantity}
      onChange={setQuantity}
      disabled={missingPrice}
      // Squeezed stepper next to the price on stacked cards; regular size
      // in the inline (grid/row view) layout below.
      size={priceSlot ? "sm" : "default"}
    />
  );

  const row = priceSlot ? (
    // Price + quantity share the first row; Add to Cart gets its own row.
    // h-9 keeps the row at the regular control height so prices stay on the
    // same line as neighboring cards (incl. Quick View cards).
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 h-9">
        {priceSlot}
        {selector}
      </div>
      <AddToCart
        productId={productId}
        quantity={quantity}
        className="w-full justify-center h-9"
        customInputs={customInputs}
        productFields={productFields}
        onBeforeAdd={onBeforeAdd}
        disabled={missingPrice}
      />
    </div>
  ) : (
    // max-w-xl ≈ the details column's width in the default centered shell —
    // keeps the PDP button from stretching enormous when the full-width
    // layout hands this column most of an ultra-wide viewport.
    <div className={compact ? "flex items-center gap-2" : "space-y-4 max-w-xl"}>
      {compact ? (
        <>
          {selector}
          <AddToCart
            productId={productId}
            quantity={quantity}
            className="flex-1 justify-center h-9"
            customInputs={customInputs}
            productFields={productFields}
            onBeforeAdd={onBeforeAdd}
            disabled={missingPrice}
          />
        </>
      ) : (
        <div className="flex items-center gap-4">
          {selector}
          <AddToCart
            productId={productId}
            quantity={quantity}
            variant="full"
            className="flex-1 justify-center"
            customInputs={customInputs}
            productFields={productFields}
            onBeforeAdd={onBeforeAdd}
            disabled={missingPrice}
          />
        </div>
      )}
    </div>
  );

  if (!missingPrice) return row;

  // Wrapper-level hover tooltip — the disabled button itself doesn't fire
  // mouse events, so the group class lives on the enclosing div.
  return (
    <div className="relative group/noprice">
      {row}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/noprice:opacity-100 transition-opacity pointer-events-none z-50">
        {t("missingPriceTooltip")}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
