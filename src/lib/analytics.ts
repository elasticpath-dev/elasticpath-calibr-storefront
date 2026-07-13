import posthog from "posthog-js";

const ENABLED = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

function ready(): boolean {
  return ENABLED && typeof window !== "undefined";
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
