import posthog from "posthog-js";

let initialized = false;

/**
 * Initialize PostHog once, from whatever config source is available — the
 * build-time env (via instrumentation-client) or, more commonly, the runtime
 * tenant config (via AnalyticsInit). No-op on the server, without a key, or if
 * already initialized, so it's safe to call from both.
 */
export function initAnalytics(key?: string, host?: string): void {
  if (initialized || typeof window === "undefined" || !key) return;
  // Ingest straight to the tenant config's PostHog host (region-correct — a key
  // only works against its own region), rather than the build-fixed /ingest
  // proxy. Defaults to EU when the config omits a host.
  const apiHost = host || "https://eu.i.posthog.com";
  posthog.init(key, {
    api_host: apiHost,
    // Dashboard ("ui") host, derived from the ingestion host.
    ui_host: apiHost.replace(".i.posthog.com", ".posthog.com"),
    // Opt into current SDK behavior: automatic pageview capture on App Router
    // client-side navigations, pageleave events, etc.
    defaults: "2025-05-24",
  });
  initialized = true;
}

function ready(): boolean {
  return initialized && typeof window !== "undefined";
}

/** Capture a custom product-analytics event (no-op when PostHog is not configured). */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  if (!ready()) return;
  posthog.capture(name, properties);
}

/** Tie subsequent events to a known shopper (call on login/registration). */
export function identifyUser(
  distinctId: string,
  properties?: Record<string, unknown>,
): void {
  if (!ready()) return;
  posthog.identify(distinctId, properties);
}

/** Detach the device from the identified shopper (call on logout). */
export function resetAnalyticsUser(): void {
  if (!ready()) return;
  posthog.reset();
}
