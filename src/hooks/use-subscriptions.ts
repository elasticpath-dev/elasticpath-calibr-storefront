"use client";

import { useState, useEffect, useCallback } from "react";
import { listSubscriptions } from "@epcc-sdk/sdks-shopper";
import { createEpClient } from "@/lib/api/ep-client";
import { useAuth } from "@/context/AuthContext";

const DEFAULT_PAGE_SIZE = 10;

export type SubscriptionSummary = {
  id: string;
  offeringId: string;
  offeringName: string;
  offeringDescription?: string;
  planName?: string;
  pricingOptionName?: string;
  priceFormatted?: string;
  billingFrequency?: { count: number; intervalType: string };
  /** Lifecycle state: active | paused | canceled | suspended | pending | closed */
  status: string;
  /** Billing status from meta.status: "active" | "inactive" */
  billingStatus: string;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  createdAt?: string;
  nextBillingAt?: string;
};

export type DisplayStatus = {
  labelKey: string;
  variant: "success" | "warning" | "error" | "info" | "default";
};

export function getDisplayStatus(sub: Pick<SubscriptionSummary, "status" | "billingStatus">): DisplayStatus {
  switch (sub.status) {
    case "canceled":  return { labelKey: "subscriptionStatusCancelled", variant: "error" };
    case "paused":    return { labelKey: "subscriptionStatusPaused",    variant: "info" };
    case "suspended": return { labelKey: "subscriptionStatusSuspended", variant: "error" };
    case "pending":   return { labelKey: "subscriptionStatusPending",   variant: "info" };
    case "closed":    return { labelKey: "subscriptionStatusClosed",    variant: "default" };
  }
  return sub.billingStatus === "active"
    ? { labelKey: "subscriptionStatusActive",   variant: "success" }
    : { labelKey: "subscriptionStatusInactive", variant: "warning" };
}

function deriveStatus(meta: any): string {
  if (meta?.canceled) return "canceled";
  if (meta?.paused) return "paused";
  if (meta?.suspended) return "suspended";
  if (meta?.pending) return "pending";
  if (meta?.closed) return "closed";
  return meta?.status ?? "unknown";
}

export function rawToSubscriptionSummary(
  sub: any,
  plansById: Map<string, string>,
  pricingOptionsById: Map<string, any>,
): SubscriptionSummary {
  const planId: string = sub.attributes?.plan_id ?? "";
  const po = sub.attributes?.pricing_option_id
    ? pricingOptionsById.get(sub.attributes.pricing_option_id)
    : undefined;
  const poAttrs = po?.attributes;

  const priceFormatted =
    po?.meta?.prices?.[planId]?.display_price?.without_tax?.formatted ??
    undefined;

  const billingFrequency =
    poAttrs?.billing_frequency && poAttrs?.billing_interval_type
      ? { count: poAttrs.billing_frequency as number, intervalType: poAttrs.billing_interval_type as string }
      : undefined;

  const meta = sub.meta ?? {};

  return {
    id: sub.id ?? "",
    offeringId: sub.attributes?.offering?.id ?? "",
    offeringName: sub.attributes?.offering?.attributes?.name ?? "—",
    offeringDescription:
      sub.attributes?.offering?.attributes?.description ?? undefined,
    planName: planId ? (plansById.get(planId) ?? undefined) : undefined,
    pricingOptionName: poAttrs?.name as string | undefined,
    priceFormatted,
    billingFrequency,
    status: deriveStatus(meta),
    billingStatus: meta.status ?? "unknown",
    canPause: poAttrs?.can_pause || false,
    canResume: poAttrs?.can_resume || false,
    canCancel: poAttrs?.can_cancel || false,
    createdAt: meta.timestamps?.created_at ?? undefined,
    nextBillingAt: meta.invoice_after ?? undefined,
  };
}

export type PaginatedSubscriptionsResult = {
  subscriptions: SubscriptionSummary[];
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  setPage: (page: number) => void;
  refetch: () => void;
};

export function usePaginatedSubscriptions(
  pageSize = DEFAULT_PAGE_SIZE,
): PaginatedSubscriptionsResult {
  const { isAuthenticated, credentials } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !credentials?.selected) return;

    let cancelled = false;
    setIsLoading(true);

    const offset = (currentPage - 1) * pageSize;
    const client = createEpClient();

    (listSubscriptions as any)({
      client,
      query: {
        include: ["plans", "pricing_options"],
        "page[limit]": pageSize,
        "page[offset]": offset,
      },
    })
      .then((res: any) => {
        if (cancelled) return;
        const raw: any[] = res?.data?.data ?? [];
        const includedPlans: any[] = res?.data?.included?.plans ?? [];
        const includedPOs: any[] = res?.data?.included?.pricing_options ?? [];

        const plansById = new Map<string, string>(
          includedPlans.map((p: any) => [
            p.id as string,
            p.attributes?.name ?? "",
          ]),
        );
        const pricingOptionsById = new Map<string, any>(
          includedPOs.map((p: any) => [p.id as string, p]),
        );

        setSubscriptions(
          raw.map((s: any) =>
            rawToSubscriptionSummary(s, plansById, pricingOptionsById),
          ),
        );
        const meta = res?.data?.meta;
        setTotalPages(meta?.page?.total ?? 1);
      })
      .catch(() => {
        if (!cancelled) setSubscriptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, pageSize, isAuthenticated, credentials?.selected, fetchKey]);

  const setPage = useCallback((page: number) => setCurrentPage(page), []);
  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  return {
    subscriptions,
    currentPage,
    totalPages,
    isLoading,
    setPage,
    refetch,
  };
}
