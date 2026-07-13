"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { SubscriptionContext } from "@/context/SubscriptionContext";
import { AddToCart } from "@/components/product/AddToCart";
import { frequencyLabel } from "@/lib/subscription-frequency";
import type {
  MembershipFeature,
  MembershipOffering,
  MembershipPlan,
  MembershipPricingOption,
} from "@/lib/api/subscriptions";

type Props = {
  offering: MembershipOffering;
};

const COLLAPSED_FEATURE_COUNT = 5;

function cadenceKey(po: MembershipPricingOption): string {
  return `${po.billingFrequency}:${po.billingIntervalType}`;
}

export function MembershipPlans({ offering }: Props) {
  const tProduct = useTranslations("product");

  // Union of distinct billing cadences across all plans (e.g. Monthly,
  // Annual) — shown as one shared toggle above the cards, matching how
  // SaaS pricing pages typically let you switch billing frequency once for
  // every plan rather than per-card.
  const cadences = useMemo(() => {
    const seen = new Map<string, MembershipPricingOption>();
    for (const plan of offering.plans) {
      for (const po of plan.pricingOptions) {
        const key = cadenceKey(po);
        if (!seen.has(key)) seen.set(key, po);
      }
    }
    return Array.from(seen.values());
  }, [offering.plans]);

  const [selectedCadenceKey, setSelectedCadenceKey] = useState(
    cadences[0] ? cadenceKey(cadences[0]) : "",
  );

  // Shared across all cards — expanding features in one card expands every
  // card, so the grid doesn't end up with mismatched heights/features shown.
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  function pricingOptionFor(
    plan: MembershipPlan,
  ): MembershipPricingOption | undefined {
    return (
      plan.pricingOptions.find((po) => cadenceKey(po) === selectedCadenceKey) ??
      plan.pricingOptions[0]
    );
  }

  return (
    <div className="space-y-8">
      {/* Billing cadence toggle */}
      {cadences.length > 1 && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 p-1">
            {cadences.map((po) => {
              const key = cadenceKey(po);
              const active = key === selectedCadenceKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCadenceKey(key)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                    active
                      ? "bg-white text-ink-900 shadow-sm"
                      : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  {frequencyLabel(
                    tProduct,
                    po.billingFrequency,
                    po.billingIntervalType,
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
        {offering.plans.map((plan) => (
          <PlanCard
            key={plan.id}
            offeringId={offering.offeringId}
            plan={plan}
            pricingOption={pricingOptionFor(plan)}
            features={offering.features}
            expanded={featuresExpanded}
            onToggleExpanded={() => setFeaturesExpanded((e) => !e)}
          />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  offeringId,
  plan,
  pricingOption,
  features,
  expanded,
  onToggleExpanded,
}: {
  offeringId: string;
  plan: MembershipPlan;
  pricingOption: MembershipPricingOption | undefined;
  features: MembershipFeature[];
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const t = useTranslations("membership");
  const tProduct = useTranslations("product");

  const visibleFeatures = expanded
    ? features
    : features.slice(0, COLLAPSED_FEATURE_COUNT);
  const hiddenCount = features.length - visibleFeatures.length;

  const subscriptionConfig = pricingOption
    ? {
        offeringId,
        plan: plan.id,
        pricing_option: pricingOption.id,
        planName: plan.name,
        frequency: frequencyLabel(
          tProduct,
          pricingOption.billingFrequency,
          pricingOption.billingIntervalType,
        ),
      }
    : null;

  return (
    <div className="flex flex-col rounded-2xl border-2 border-ink-200 bg-white p-6">
      <p className="text-[18px] font-bold text-ink-900">{plan.name}</p>
      {plan.description && (
        <p className="mt-1 text-[13px] text-ink-600">{plan.description}</p>
      )}

      <div className="mt-4 mb-5">
        {pricingOption?.priceFormatted ? (
          <p className="flex items-baseline gap-1.5">
            <span className="text-[36px] font-bold text-ink-900 tracking-tight">
              {pricingOption.priceFormatted}
            </span>
            <span className="text-[13px] text-ink-600">
              /{" "}
              {frequencyLabel(
                tProduct,
                pricingOption.billingFrequency,
                pricingOption.billingIntervalType,
              ).toLowerCase()}
            </span>
          </p>
        ) : (
          <p className="text-[15px] text-ink-400">{t("priceUnavailable")}</p>
        )}
      </div>

      {features.length > 0 && (
        <div className="flex-1 mt-2">
          <ul className="space-y-2">
            {visibleFeatures.map((feature) => {
              const included = plan.featureIds.includes(feature.id);
              return (
                <li
                  key={feature.id}
                  className="flex items-start gap-2.5 text-[13px]"
                >
                  {included ? (
                    <Check
                      size={15}
                      className="text-success-600 flex-none mt-0.5"
                    />
                  ) : (
                    <X size={15} className="text-ink-300 flex-none mt-0.5" />
                  )}
                  <span className={included ? "text-ink-900" : "text-ink-400"}>
                    {feature.name}
                  </span>
                </li>
              );
            })}
          </ul>

          {features.length > COLLAPSED_FEATURE_COUNT && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-brand-primary hover:opacity-80 transition-opacity"
            >
              {expanded ? (
                <>
                  {t("showLess")}
                  <ChevronUp size={13} />
                </>
              ) : (
                <>
                  {t("showMore", { count: hiddenCount })}
                  <ChevronDown size={13} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      <SubscriptionContext.Provider value={subscriptionConfig}>
        <AddToCart
          productId=""
          variant="full"
          disabled={!pricingOption}
          label={t("selectPlan", { plan: plan.name })}
          addedLabel={t("added")}
          className="mt-6"
        />
      </SubscriptionContext.Provider>
    </div>
  );
}
