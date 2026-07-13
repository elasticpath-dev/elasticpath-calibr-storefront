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
};

export function QuantityAddToCart({ productId, customInputs, productFields, onBeforeAdd }: Props) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <QuantitySelector value={quantity} onChange={setQuantity} />
        <AddToCart
          productId={productId}
          quantity={quantity}
          variant="full"
          className="flex-1"
          customInputs={customInputs}
          productFields={productFields}
          onBeforeAdd={onBeforeAdd}
        />
      </div>
    </div>
  );
}
