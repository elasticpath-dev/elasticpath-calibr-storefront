"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenantConfig } from "@/context/TenantConfigContext";

/**
 * Hides its children while the storefront is non-transactional: marketing mode
 * is on and the shopper isn't signed in. Used in the header to drop the
 * search, cart, settings and bulk-order controls (which all need Elastic Path)
 * until sign-in, leaving only marketing content + the account/sign-in entry.
 */
export function MarketingGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { marketingMode } = useTenantConfig();
  if (marketingMode && !isAuthenticated) return null;
  return <>{children}</>;
}
