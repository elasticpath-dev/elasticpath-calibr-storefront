"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { SubscriptionContext } from "@/context/SubscriptionContext";
import { SubscriptionSelector } from "./SubscriptionSelector";
import { ProductActions } from "./ProductActions";
import { Price } from "./Price";
import type { BundleComponent, ProductCustomInput, ProductVariation } from "@/lib/api/products";
import type { ProductOffering } from "@/lib/api/subscriptions";

type Props = {
  productId: string;
  lang: string;
  isBundle?: boolean;
  components?: BundleComponent[];
  initialPrice: string;
  initialOriginalPrice?: string;
  variations?: ProductVariation[];
  variationMatrix?: Record<string, unknown>;
  childSlugs?: Record<string, string>;
  selectedOptionIds?: string[];
  parentId?: string;
  imageUrl?: string;
  initialOffering?: ProductOffering | null;
  navigateOnSelect?: boolean;
  productCustomInputs?: Record<string, ProductCustomInput>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function frequencyLabel(t: any, freq: number, interval: string): string {
  const key = `frequency${interval.charAt(0).toUpperCase()}${interval.slice(1)}`;
  return t(key, { count: freq });
}

export function VariationSubscriptionActions({
  productId,
  lang,
  isBundle,
  components,
  initialPrice,
  initialOriginalPrice,
  variations,
  variationMatrix,
  childSlugs,
  selectedOptionIds,
  parentId,
  imageUrl,
  initialOffering,
  navigateOnSelect = false,
  productCustomInputs,
}: Props) {
  const t = useTranslations("product");

  const [offering, setOffering] = useState<ProductOffering | null>(
    initialOffering ?? null,
  );
  const [activeCustomInputs, setActiveCustomInputs] = useState(productCustomInputs);
  const [priceFormatted, setPriceFormatted] = useState(initialPrice);
  const [originalPriceFormatted, setOriginalPriceFormatted] = useState<
    string | undefined
  >(initialOriginalPrice);
  const [purchaseType, setPurchaseType] = useState<"onetime" | "subscribe">(
    "onetime",
  );
  const [planId, setPlanId] = useState<string>(
    initialOffering?.plans[0]?.id ?? "",
  );

  const activePlan =
    offering?.plans.find((p) => p.id === planId) ?? offering?.plans[0];

  const subscriptionConfig =
    purchaseType === "subscribe" && activePlan && offering
      ? {
          offeringId: offering.offeringId,
          plan: activePlan.planId,
          pricing_option: activePlan.id,
          planName: activePlan.name,
          frequency: frequencyLabel(
            t,
            activePlan.billingFrequency,
            activePlan.billingIntervalType,
          ),
          imageUrl,
        }
      : null;

  const handleVariantResolved = useCallback(
    async (childId: string | null) => {
      if (!childId) {
        setOffering(null);
        setPurchaseType("onetime");
        setPriceFormatted(initialPrice);
        setOriginalPriceFormatted(initialOriginalPrice);
        return;
      }

      const fetchOffering = (id: string) =>
        fetch(`/api/subscriptions/${encodeURIComponent(id)}`).then((r) =>
          r.ok ? r.json() : null,
        );

      // Fetch child and parent offerings in parallel.
      // Child takes priority; parent is the fallback when child has none.
      // On a child PDP, parentId is the parent product — use it as the fallback source.
      const fallbackId = parentId ?? productId;
      const [childOffering, parentOffering, productRes] = await Promise.all([
        fetchOffering(childId).catch(() => null),
        (childId !== fallbackId
          ? fetchOffering(fallbackId)
          : Promise.resolve(null)
        ).catch(() => null),
        fetch(`/api/products/${encodeURIComponent(childId)}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      const newOffering = childOffering ?? parentOffering ?? null;
      setOffering(newOffering);
      if (newOffering) {
        setPlanId(newOffering.plans[0]?.id ?? "");
        setPurchaseType("onetime");
      }
      if (productRes?.priceFormatted)
        setPriceFormatted(productRes.priceFormatted);
      setOriginalPriceFormatted(
        productRes?.originalPriceFormatted ?? undefined,
      );
      setActiveCustomInputs(productRes?.customInputs ?? productCustomInputs);
    },
    [initialPrice, initialOriginalPrice, productId],
  );

  return (
    // Provider is always mounted — ProductActions stays in a stable tree position
    // and never remounts when the offering state changes.
    <SubscriptionContext.Provider value={subscriptionConfig}>
      {/* Price shows above selectors when there is no subscription offering */}
      {!offering && (
        <div className="mb-6">
          <Price
            formatted={priceFormatted}
            originalFormatted={originalPriceFormatted}
            className="text-2xl"
          />
        </div>
      )}
      <ProductActions
        productId={productId}
        lang={lang}
        isBundle={isBundle}
        components={components}
        initialPrice={priceFormatted}
        initialOriginalPrice={originalPriceFormatted}
        variations={variations}
        variationMatrix={variationMatrix}
        childSlugs={childSlugs}
        selectedOptionIds={selectedOptionIds}
        parentId={parentId}
        navigateOnSelect={navigateOnSelect}
        onVariantResolved={handleVariantResolved}
        productCustomInputs={activeCustomInputs}
        slotBelowSelectors={
          offering ? (
            <SubscriptionSelector
              offering={offering}
              oneTimePrice={priceFormatted}
              originalPrice={originalPriceFormatted}
              selected={purchaseType}
              selectedPlanId={planId}
              onTypeChange={setPurchaseType}
              onPlanChange={setPlanId}
            />
          ) : undefined
        }
      />
    </SubscriptionContext.Provider>
  );
}
