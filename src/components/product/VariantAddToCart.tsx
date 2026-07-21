"use client";

import React, { useState, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ProductCustomInput, ProductVariation } from "@/lib/api/products";
import type { ProductField } from "@/context/CartContext";
import { getProductByIdAction } from "@/lib/actions/product";
import { ProductVariationSelector } from "./ProductVariationSelector";
import { QuantityAddToCart } from "./QuantityAddToCart";
import { CustomInputsForm } from "./CustomInputsForm";
import { ProductLocationInventory } from "./ProductLocationInventory";
import { useProductInventory } from "@/hooks/use-product-inventory";

type Props = {
  productId: string;
  lang: string;
  variations?: ProductVariation[];
  variationMatrix?: Record<string, unknown>;
  selectedOptionIds?: string[];
  navigateOnSelect?: boolean;
  onVariantResolved?: (childId: string | null) => void;
  parentId?: string;
  slotBelowSelectors?: React.ReactNode;
  productCustomInputs?: Record<string, ProductCustomInput>;
  /** "physical" | "digital" — from ProductDetailData.commodityType. */
  commodityType?: string;
  /** No price in the active price book — disables add to cart with a tooltip. */
  missingPrice?: boolean;
};

export function VariantAddToCart({
  productId,
  lang,
  variations,
  variationMatrix,
  selectedOptionIds,
  navigateOnSelect = true,
  onVariantResolved,
  parentId,
  slotBelowSelectors,
  productCustomInputs,
  commodityType,
  missingPrice = false,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const t = useTranslations("product");

  const initialSelectedOptions = useMemo(() => {
    if (!selectedOptionIds?.length || !variations?.length) return {};
    const result: Record<string, string> = {};
    for (const variation of variations) {
      const match = variation.options.find((o) =>
        selectedOptionIds.includes(o.id),
      );
      if (match) result[variation.id] = match.id;
    }
    return result;
  }, [selectedOptionIds, variations]);

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(initialSelectedOptions);

  const [productFieldValues, setProductFieldValues] = useState<
    Record<string, string>
  >({});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [resolvedProductId, setResolvedProductId] = useState<string | null>(
    selectedOptionIds?.length ? productId : null,
  );

  const hasVariations = !!variations?.length && !!variationMatrix;
  const allSelected =
    hasVariations && variations!.every((v) => selectedOptions[v.id]);
  const effectiveProductId = hasVariations
    ? (resolvedProductId ?? productId)
    : productId;

  // Multi-location stock for the concrete product being added — for variations
  // that's the resolved child once every option is chosen (skip until then so
  // we don't check the parent's stock).
  const inventory = useProductInventory(
    !hasVariations || allSelected ? effectiveProductId : null,
  );

  function validateRequiredInputs(): boolean {
    if (!productCustomInputs) return true;
    const errors: Record<string, string> = {};
    for (const [key, cfg] of Object.entries(productCustomInputs)) {
      if (cfg.required && !productFieldValues[key]?.trim()) {
        errors[key] = t("customInputRequired");
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const isDigital = commodityType === "digital";

  const customInputs = useMemo<Record<string, string> | undefined>(() => {
    let variantInputs: Record<string, string> | undefined;
    if (hasVariations && allSelected) {
      // Case 1: on child product PDP — parentId prop is the parent, productId is the child
      // Case 2: on parent PDP / quick view — productId is the parent, resolvedProductId is the child
      const effectiveParentId = parentId ?? productId;
      const effectiveChildId = parentId ? productId : resolvedProductId;
      if (effectiveChildId && effectiveChildId !== effectiveParentId) {
        const optionNames = variations!
          .map((v) => v.options.find((o) => o.id === selectedOptions[v.id])?.name)
          .filter((n): n is string => !!n);
        if (optionNames.length) {
          variantInputs = {
            parent_product_id: effectiveParentId,
            options: optionNames.join(" / "),
          };
        }
      }
    }
    if (!isDigital && !variantInputs) return undefined;
    return {
      ...variantInputs,
      ...(isDigital ? { is_digital: "true" } : {}),
    };
  }, [
    hasVariations,
    allSelected,
    parentId,
    productId,
    resolvedProductId,
    variations,
    selectedOptions,
    isDigital,
  ]);

  const childSlugCache = useRef<Map<string, string>>(new Map());

  function handleOptionChange(variationId: string, optionId: string) {
    setSelectedOptions((prev) => ({ ...prev, [variationId]: optionId }));
  }

  async function handleProductResolved(childId: string | null) {
    setResolvedProductId(childId);
    onVariantResolved?.(childId);
    if (!navigateOnSelect || !childId) return;

    // Only fetch the resolved child's own data once a full selection is
    // made — not every child up front just to know its slug.
    const cached = childSlugCache.current.get(childId);
    const slug = cached ?? (await getProductByIdAction(childId))?.slug;
    if (!slug) return;
    childSlugCache.current.set(childId, slug);
    startTransition(() => {
      router.replace(`/${lang}/products/${slug}`);
    });
  }

  return (
    <div className="space-y-6">
      {hasVariations && (
        <ProductVariationSelector
          variations={variations!}
          variationMatrix={variationMatrix!}
          selectedOptions={selectedOptions}
          onOptionChange={handleOptionChange}
          onProductResolved={handleProductResolved}
        />
      )}

      {slotBelowSelectors}

      {productCustomInputs && Object.keys(productCustomInputs).length > 0 && (
        <CustomInputsForm
          inputs={productCustomInputs}
          values={productFieldValues}
          errors={fieldErrors}
          onChange={(key, value) => {
            setProductFieldValues((prev) => ({ ...prev, [key]: value }));
            if (fieldErrors[key]) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              });
            }
          }}
        />
      )}

      <ProductLocationInventory inventory={inventory} />

      <div className="relative group/cart">
        <div
          className={
            hasVariations && !allSelected
              ? "opacity-50 pointer-events-none"
              : ""
          }
        >
          <QuantityAddToCart
            productId={effectiveProductId}
            missingPrice={missingPrice}
            outOfStock={inventory.outOfStock}
            location={inventory.selectedSlug ?? undefined}
            customInputs={customInputs}
            productFields={
              productCustomInputs
                ? Object.entries(productFieldValues).map<ProductField>(([key, value]) => ({
                    key,
                    label: productCustomInputs[key]?.name ?? key,
                    value,
                  }))
                : undefined
            }
            onBeforeAdd={validateRequiredInputs}
          />
        </div>
        {hasVariations && !allSelected && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/cart:opacity-100 transition-opacity pointer-events-none z-10">
            {t("selectAllOptions")}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    </div>
  );
}
