import { listOfferings, getOffering } from "@epcc-sdk/sdks-shopper";
import { createElasticPathClient } from "@/lib/create-elastic-path-client";

export type SubscriptionPlan = {
  id: string; // pricing option ID → used as pricing_option in cart body
  planId: string; // plan ID → used as plan in cart body
  name: string; // pricing option name
  planName: string; // plan name (from the plan resource)
  billingFrequency: number;
  billingIntervalType: "day" | "week" | "month" | "year";
  priceFormatted?: string;
  priceAmount?: number;
};

export type ProductOffering = {
  offeringId: string;
  name: string;
  plans: SubscriptionPlan[];
};

export async function getProductOffering(
  productId: string,
): Promise<ProductOffering | null> {
  try {
    const client = await createElasticPathClient();
    const res = await listOfferings({
      client,
      query: {
        filter: `eq(plans.external_ref,${productId})`,
        include: ["plans", "pricing_options"],
      } as any,
    });

    const offeringRaw = ((res.data as any)?.data ?? [])[0];
    if (!offeringRaw) return null;

    const included = (res.data as any)?.included ?? {};
    const pricingOptions: any[] = included?.pricing_options ?? [];

    const rawPlans: any[] = included?.plans ?? [];
    const firstPlanId: string = rawPlans[0]?.id ?? "";
    const planNameMap = new Map<string, string>(
      rawPlans.map((p: any) => [
        p.id as string,
        (p.attributes?.name as string) ?? "",
      ]),
    );

    const plans: SubscriptionPlan[] = pricingOptions.map((po: any) => {
      // planId is the key of meta.prices (which plan this pricing option applies to)
      const planId: string =
        Object.keys(po.meta?.prices ?? {})[0] ?? firstPlanId;
      // display_price may sit directly on meta OR nested under meta.prices[planId]
      const dp =
        po.meta?.display_price ??
        (po.meta?.prices as any)?.[planId]?.display_price;
      return {
        id: po.id as string,
        planId,
        planName: planNameMap.get(planId) ?? "",
        name: (po.attributes?.name as string) ?? "Subscription",
        billingFrequency: (po.attributes?.billing_frequency as number) ?? 1,
        billingIntervalType:
          (po.attributes
            ?.billing_interval_type as SubscriptionPlan["billingIntervalType"]) ??
          "month",
        priceFormatted:
          dp?.with_tax?.formatted ?? dp?.without_tax?.formatted ?? undefined,
        priceAmount:
          dp?.with_tax?.amount ?? dp?.without_tax?.amount ?? undefined,
      };
    });

    if (!plans.length) return null;

    return {
      offeringId: offeringRaw.id as string,
      name: (offeringRaw.attributes?.name as string) ?? "Subscription",
      plans,
    };
  } catch {
    return null;
  }
}

// ── Membership offerings (standalone, bought directly by offering ID — not
// tied to a PXM product like getProductOffering above) ─────────────────────

export type MembershipFeature = {
  id: string;
  name: string;
  description?: string;
};

export type MembershipPricingOption = {
  id: string; // pricing option ID → used as pricing_option in cart body
  name: string;
  billingFrequency: number;
  billingIntervalType: "day" | "week" | "month" | "year";
  priceFormatted?: string;
  priceAmount?: number;
};

export type MembershipPlan = {
  id: string; // plan ID → used as plan in cart body
  name: string;
  description?: string;
  /** IDs of features (from MembershipOffering.features) included in this plan. */
  featureIds: string[];
  pricingOptions: MembershipPricingOption[];
};

export type MembershipOffering = {
  offeringId: string;
  name: string;
  description?: string;
  features: MembershipFeature[];
  plans: MembershipPlan[];
};

export async function getOfferingById(
  offeringId: string,
): Promise<MembershipOffering | null> {
  try {
    const client = await createElasticPathClient();
    const res = await getOffering({
      client,
      path: { offering_uuid: offeringId },
      query: { include: ["plans", "pricing_options", "features"] } as any,
    });

    const offeringRaw = (res.data as any)?.data;
    if (!offeringRaw) return null;

    const included = (res.data as any)?.included ?? {};
    const rawFeatures: any[] = included?.features ?? [];
    const rawPlans: any[] = included?.plans ?? [];
    const rawPricingOptions: any[] = included?.pricing_options ?? [];

    const features: MembershipFeature[] = rawFeatures.map((f: any) => ({
      id: f.id as string,
      name: (f.attributes?.name as string) ?? "",
      description: f.attributes?.description as string | undefined,
    }));

    const plans: MembershipPlan[] = rawPlans
      .map((p: any) => {
        const planId = p.id as string;
        const featureIds = Object.keys(p.attributes?.feature_configurations ?? {});

        const pricingOptions: MembershipPricingOption[] = rawPricingOptions
          .filter((po: any) => po.meta?.prices?.[planId])
          .map((po: any) => {
            const dp = po.meta.prices[planId]?.display_price;
            return {
              id: po.id as string,
              name: (po.attributes?.name as string) ?? "Subscription",
              billingFrequency: (po.attributes?.billing_frequency as number) ?? 1,
              billingIntervalType:
                (po.attributes
                  ?.billing_interval_type as MembershipPricingOption["billingIntervalType"]) ??
                "month",
              priceFormatted:
                dp?.with_tax?.formatted ?? dp?.without_tax?.formatted ?? undefined,
              priceAmount:
                dp?.with_tax?.amount ?? dp?.without_tax?.amount ?? undefined,
            };
          });

        return {
          id: planId,
          name: (p.attributes?.name as string) ?? "",
          description: p.attributes?.description as string | undefined,
          featureIds,
          pricingOptions,
        };
      })
      .filter((p) => p.pricingOptions.length > 0);

    if (!plans.length) return null;

    return {
      offeringId: offeringRaw.id as string,
      name: (offeringRaw.attributes?.name as string) ?? "Membership",
      description: offeringRaw.attributes?.description as string | undefined,
      features,
      plans,
    };
  } catch {
    return null;
  }
}
