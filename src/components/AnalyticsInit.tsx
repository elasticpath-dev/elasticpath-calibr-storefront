"use client";

import { useEffect } from "react";
import { useTenantConfig } from "@/context/TenantConfigContext";
import { initAnalytics } from "@/lib/analytics";

/**
 * Initializes PostHog from the runtime tenant config (analytics.posthogKey /
 * posthogHost), so the key can come from the tenant-config endpoint instead of
 * a build-time NEXT_PUBLIC_ var. initAnalytics is guarded (first caller wins),
 * so this is a no-op if instrumentation-client already initialized from env.
 */
export function AnalyticsInit() {
  const { analytics } = useTenantConfig();
  const key = analytics?.posthogKey;
  const host = analytics?.posthogHost;
  useEffect(() => {
    initAnalytics(key, host);
  }, [key, host]);
  return null;
}
