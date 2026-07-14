"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { BundleConfigurator } from "./BundleConfigurator";
import { VariantAddToCart } from "./VariantAddToCart";
import type { BundleComponent, ProductCustomInput, ProductVariation } from "@/lib/api/products";

type Props = {
  productId: string;
  lang: string;
  isBundle?: boolean;
  components?: BundleComponent[];
  initialPrice?: string;
  initialOriginalPrice?: string;
  variations?: ProductVariation[];
  variationMatrix?: Record<string, unknown>;
  selectedOptionIds?: string[];
  parentId?: string;
  navigateOnSelect?: boolean;
  onVariantResolved?: (childId: string | null) => void;
  slotBelowSelectors?: React.ReactNode;
  productCustomInputs?: Record<string, ProductCustomInput>;
  commodityType?: string;
};

export function ProductActions({
  productId,
  lang,
  isBundle,
  components,
  initialPrice,
  initialOriginalPrice,
  variations,
  variationMatrix,
  selectedOptionIds,
  parentId,
  navigateOnSelect,
  onVariantResolved,
  slotBelowSelectors,
  productCustomInputs,
  commodityType,
}: Props) {
  const { credentials } = useAuth();
  const authKey = credentials?.selected ?? "guest";

  if (isBundle && components?.length) {
    return (
      <BundleConfigurator
        productId={productId}
        components={components}
        initialPrice={initialPrice}
        initialOriginalPrice={initialOriginalPrice}
      />
    );
  }

  return (
    <VariantAddToCart
      key={authKey}
      productId={productId}
      lang={lang}
      variations={variations}
      variationMatrix={variationMatrix}
      selectedOptionIds={selectedOptionIds}
      parentId={parentId}
      navigateOnSelect={navigateOnSelect}
      onVariantResolved={onVariantResolved}
      slotBelowSelectors={slotBelowSelectors}
      productCustomInputs={productCustomInputs}
      commodityType={commodityType}
    />
  );
}
