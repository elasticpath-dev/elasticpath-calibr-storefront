import { cookies } from "next/headers";
import { CURRENCY_COOKIE_KEY } from "./currency";
import { getTenantConfig } from "./tenant-config";

/**
 * Reads the shopper's selected currency from the request cookie, validated
 * against the resolved tenant's available currencies. Falls back to the
 * tenant's default outside a request context (e.g. build time) or when the
 * cookie is missing/invalid/for a different tenant's currency list.
 */
export async function getServerCurrency(): Promise<string> {
  const { currency } = await getTenantConfig();
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(CURRENCY_COOKIE_KEY)?.value?.toUpperCase();
    if (value && currency.available.includes(value)) return value;
  } catch {
    // Outside request context — no cookie available
  }
  return currency.default;
}
