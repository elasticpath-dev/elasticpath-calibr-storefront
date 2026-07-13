import { loadStripe, type Stripe } from "@stripe/stripe-js";

// loadStripe() is meant to be called once per key — memoize per
// publishable key so re-renders (or switching tenants across requests
// in a multi-tenant deployment) don't reinitialize Stripe.js repeatedly.
const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

export function getStripePromise(
  publishableKey: string,
  accountId?: string,
): Promise<Stripe | null> {
  if (!publishableKey) return Promise.resolve(null);
  const cacheKey = `${publishableKey}:${accountId ?? ""}`;
  let cached = stripePromiseCache.get(cacheKey);
  if (!cached) {
    cached = loadStripe(publishableKey, accountId ? { stripeAccount: accountId } : undefined);
    stripePromiseCache.set(cacheKey, cached);
  }
  return cached;
}

/**
 * When a Stripe account ID is set the storefront is configured for
 * Elastic Path Payments (EP-managed Stripe connected account).
 * Without it, fall back to the merchant's own Stripe via EP's standard gateway.
 */
export function getStripeGateway(
  accountId: string | undefined,
): "elastic_path_payments_stripe" | "stripe_payment_intents" {
  return accountId ? "elastic_path_payments_stripe" : "stripe_payment_intents";
}
