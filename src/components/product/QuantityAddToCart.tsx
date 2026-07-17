"use client";

import { useState } from "react";
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
};

export function QuantityAddToCart({
  productId,
  customInputs,
  productFields,
  onBeforeAdd,
  compact = false,
}: Props) {
  const [quantity, setQuantity] = useState(1);

  const control = (
    <>
      <QuantitySelector value={quantity} onChange={setQuantity} />
      <AddToCart
        productId={productId}
        quantity={quantity}
        variant={compact ? "default" : "full"}
        className={compact ? "flex-1 justify-center h-9" : "flex-1 justify-center"}
        customInputs={customInputs}
        productFields={productFields}
        onBeforeAdd={onBeforeAdd}
      />
    </>
  );

  if (compact) {
    return <div className="flex items-center gap-2">{control}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">{control}</div>
    </div>
  );
}
