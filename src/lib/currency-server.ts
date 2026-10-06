import { cookies } from "next/headers";
import {
  ACCOUNT_CURRENCY_COOKIE_KEY,
  CURRENCY_COOKIE_KEY,
} from "./currency";
import { getTenantConfig } from "./tenant-config";

/**
 * Resolves the active currency for the request:
 *  1. The signed-in account's currency (flow field), when set — it overrides
 *     everything so a logged-in B2B account always transacts in its currency.
 *  2. Otherwise the shopper's selected currency cookie, validated against the
 *     tenant's available currencies.
 *  3. Otherwise the tenant default (also the fallback outside a request).
 */
export async function getServerCurrency(): Promise<string> {
  const { currency } = await getTenantConfig();
  try {
    const cookieStore = await cookies();

    // Account-level currency wins. It can be any EP-valid currency (not limited
    // to the storefront's dropdown list), so it's trusted as-is when present.
    const account = cookieStore
      .get(ACCOUNT_CURRENCY_COOKIE_KEY)
      ?.value?.toUpperCase();
    if (account) return account;

    const value = cookieStore.get(CURRENCY_COOKIE_KEY)?.value?.toUpperCase();
    if (value && currency.available.includes(value)) return value;
  } catch {
    // Outside request context — no cookie available
  }
  return currency.default;
}
