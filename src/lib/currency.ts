import { getCookie, setCookie } from "cookies-next";

export const CURRENCY_COOKIE_KEY = "_store_ep_currency";

/**
 * NEXT_PUBLIC_DEFAULT_CURRENCY sets the preselected currency;
 * NEXT_PUBLIC_CURRENCIES (comma-separated, e.g. "GBP,USD,CAD")
 * drives the header dropdown. Leave NEXT_PUBLIC_CURRENCIES unset
 * for a single-currency store with no dropdown.
 */
function parseCurrencyConfig(): { defaultCurrency: string; list: string[] } {
  const defaultCurrency = (
    process.env.NEXT_PUBLIC_DEFAULT_CURRENCY?.trim() || "USD"
  ).toUpperCase();
  const list = (process.env.NEXT_PUBLIC_CURRENCIES ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  if (!list.includes(defaultCurrency)) {
    list.unshift(defaultCurrency);
  }
  return { defaultCurrency, list };
}

// Mutable — configured once per session by <CurrencyProvider> from the
// resolved tenant config (see configureCurrencyDefaults below). Starts from
// this deployment's own env vars so single-tenant mode (and anything that
// runs before the provider mounts) behaves exactly as before.
let currencyConfig = parseCurrencyConfig();

export let DEFAULT_CURRENCY = currencyConfig.defaultCurrency;
export let AVAILABLE_CURRENCIES = currencyConfig.list;

/**
 * Called once per session by <CurrencyProvider> with the resolved tenant's
 * currency config. Client-only — a single browser tab only ever has one
 * tenant, so a module-level value is safe here (unlike server code, which
 * must resolve per-request via getTenantConfig() instead).
 */
export function configureCurrencyDefaults(config: {
  default: string;
  available: string[];
}): void {
  const defaultCurrency = config.default.toUpperCase();
  const list = config.available.map((c) => c.toUpperCase());
  if (!list.includes(defaultCurrency)) list.unshift(defaultCurrency);
  currencyConfig = { defaultCurrency, list };
  DEFAULT_CURRENCY = currencyConfig.defaultCurrency;
  AVAILABLE_CURRENCIES = currencyConfig.list;
}

export function isSupportedCurrency(code: string | undefined): code is string {
  return !!code && AVAILABLE_CURRENCIES.includes(code.toUpperCase());
}

/**
 * The shopper's selected currency. On the server this returns the
 * default — server code must read the cookie per request instead
 * (see currency-server.ts).
 */
export function getSelectedCurrency(): string {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  const cookieValue = getCookie(CURRENCY_COOKIE_KEY);
  return typeof cookieValue === "string" && isSupportedCurrency(cookieValue)
    ? cookieValue.toUpperCase()
    : DEFAULT_CURRENCY;
}

export function setSelectedCurrency(code: string): void {
  setCookie(CURRENCY_COOKIE_KEY, code.toUpperCase(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
