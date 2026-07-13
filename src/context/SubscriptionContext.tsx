"use client";

import { createContext, useContext } from "react";

export type SubscriptionConfig = {
  offeringId: string;
  plan: string;
  pricing_option: string;
  planName: string;
  frequency: string;
  imageUrl?: string;
} | null;

export const SubscriptionContext = createContext<SubscriptionConfig>(null);

export function useSubscriptionConfig(): SubscriptionConfig {
  return useContext(SubscriptionContext);
}
