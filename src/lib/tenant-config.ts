import { headers } from "next/headers";
import { cache } from "react";

export type ThemeConfig = {
  brandPrimary: string;
  brandSecondary: string;
  brandAccent: string;
  brandMuted: string;
  ink900: string;
  ink800: string;
  ink700: string;
  ink600: string;
  ink400: string;
  ink300: string;
  ink200: string;
  ink100: string;
  ink50: string;
  success600: string;
  success500: string;
  success400: string;
  error700: string;
  error600: string;
  warning600: string;
};

export type TenantConfig = {
  epcc: { endpointUrl: string; clientId: string };
  /** Never exposed to Client Components — see ClientTenantConfig. */
  security: { gatekeeperPassword: string };
  auth: { passwordProfileId: string; oidcProfileIds: string[] };
  currency: { default: string; available: string[] };
  inventory: { multiLocation: boolean };
  /** Extra headers attached to every EPCC API request, when non-empty. */
  requestHeaders: {
    epContextTag?: string;
    environmentId?: string;
    storeId?: string;
  };
  cms: { projectId: string; apiToken: string; preview: boolean };
  site: { name: string; title: string; description: string };
  theme: ThemeConfig;
  features: {
    searchEnabled: boolean;
    filterItems: string;
    extensionsExcluded: string[];
  };
  payments: {
    stripePublishableKey: string;
    stripeAccountId?: string;
    paypalEnabled: boolean;
  };
  ui: {
    defaultCartMode: "drawer" | "full";
    defaultShoppingMode: "b2c" | "b2b";
    /** True when the resolved endpoint is Elastic Path–hosted (SaaS) — shopping mode is fixed to B2C. */
    shoppingModeLocked: boolean;
    cartViewMode: "list" | "grid";
  };
  analytics: { posthogKey: string; posthogHost: string };
};

/**
 * The subset of TenantConfig safe to ship to Client Components (no
 * server-only fields). `cms.apiToken` is included deliberately — it's a
 * Plasmic Loader API token, which is already NEXT_PUBLIC_-prefixed and
 * shipped to the browser in single-tenant mode today; the client-side
 * Plasmic loader (see plasmic-loader.ts) genuinely needs it to hydrate
 * interactive CMS content for the resolved tenant.
 */
export type ClientTenantConfig = {
  epccEndpointUrl: string;
  epccClientId: string;
  passwordProfileId: string;
  oidcProfileIds: string[];
  multiLocation: boolean;
  storeName: string;
  brandInk900: string;
  cms: { projectId: string; apiToken: string; preview: boolean };
  currency: { default: string; available: string[] };
  epContextTag?: string;
  environmentId?: string;
  storeId?: string;
  stripePublishableKey: string;
  stripeAccountId?: string;
  paypalEnabled: boolean;
  defaultCartMode: "drawer" | "full";
  defaultShoppingMode: "b2c" | "b2b";
  shoppingModeLocked: boolean;
  cartViewMode: "list" | "grid";
};

export function toClientTenantConfig(config: TenantConfig): ClientTenantConfig {
  return {
    epccEndpointUrl: config.epcc.endpointUrl,
    epccClientId: config.epcc.clientId,
    passwordProfileId: config.auth.passwordProfileId,
    oidcProfileIds: config.auth.oidcProfileIds,
    multiLocation: config.inventory.multiLocation,
    storeName: config.site.name,
    brandInk900: config.theme.ink900,
    currency: config.currency,
    cms: config.cms,
    epContextTag: config.requestHeaders.epContextTag,
    environmentId: config.requestHeaders.environmentId,
    storeId: config.requestHeaders.storeId,
    stripePublishableKey: config.payments.stripePublishableKey,
    stripeAccountId: config.payments.stripeAccountId,
    paypalEnabled: config.payments.paypalEnabled,
    defaultCartMode: config.ui.defaultCartMode,
    defaultShoppingMode: config.ui.defaultShoppingMode,
    shoppingModeLocked: config.ui.shoppingModeLocked,
    cartViewMode: config.ui.cartViewMode,
  };
}

async function getRequestHostname(): Promise<string> {
  try {
    const h = await headers();
    const raw = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    return raw.split(":")[0].toLowerCase().trim();
  } catch {
    return ""; // outside request context (e.g. build time)
  }
}

function normalizeHex(v: string | undefined, fallback: string): string {
  if (!v) return fallback;
  return v.startsWith("#") ? v : `#${v}`;
}

/**
 * Reads every current NEXT_PUBLIC_* var directly — this is today's
 * single-tenant behavior, centralized into one place instead of scattered
 * module-load consts. Used both as the entire config when MULTI_TENANT_MODE
 * is off, and as the multi-tenant fallback when the external config API is
 * unreachable or the domain is unregistered.
 */
function buildTenantConfigFromEnv(): TenantConfig {
  const e = process.env;
  const defaultCurrency = (
    e.NEXT_PUBLIC_DEFAULT_CURRENCY?.trim() || "USD"
  ).toUpperCase();
  const availableCurrencies = (e.NEXT_PUBLIC_CURRENCIES ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  if (!availableCurrencies.includes(defaultCurrency))
    availableCurrencies.unshift(defaultCurrency);

  const storeName = e.NEXT_PUBLIC_STORE_NAME?.trim() || "Calibr";

  const endpointUrl = e.NEXT_PUBLIC_EPCC_ENDPOINT_URL ?? "";
  const shoppingModeLocked = endpointUrl.includes("elasticpath.com");

  return {
    epcc: { endpointUrl, clientId: e.NEXT_PUBLIC_EPCC_CLIENT_ID ?? "" },
    security: { gatekeeperPassword: e.GATEKEEPER_PASSWORD?.trim() ?? "" },
    auth: {
      passwordProfileId: e.NEXT_PUBLIC_PASSWORD_PROFILE_ID ?? "",
      oidcProfileIds: (e.NEXT_PUBLIC_OIDC_PROFILE_IDS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    },
    currency: { default: defaultCurrency, available: availableCurrencies },
    inventory: {
      multiLocation: e.NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION === "true",
    },
    requestHeaders: {
      epContextTag: e.NEXT_PUBLIC_EP_CONTEXT_TAG?.trim() ?? "",
      environmentId: e.NEXT_PUBLIC_ENVIRONMENT_ID?.trim() ?? "",
      storeId: e.NEXT_PUBLIC_STORE_ID?.trim() ?? "",
    },
    cms: {
      projectId: e.NEXT_PUBLIC_EP_CMS_PROJECT_ID ?? "",
      apiToken: e.NEXT_PUBLIC_EP_CMS_API_TOKEN ?? "",
      preview: e.NEXT_PUBLIC_EP_CMS_PREVIEW === "true",
    },
    site: {
      name: storeName,
      title: e.NEXT_PUBLIC_STORE_TITLE?.trim() || `${storeName} by Elasticpath`,
      description: e.NEXT_PUBLIC_STORE_DESCRIPTION ?? "",
    },
    theme: {
      brandPrimary: normalizeHex(e.NEXT_PUBLIC_BRAND_PRIMARY, "#000000"),
      brandSecondary: normalizeHex(e.NEXT_PUBLIC_BRAND_SECONDARY, "#144e31"),
      brandAccent: normalizeHex(e.NEXT_PUBLIC_BRAND_ACCENT, "#56dc9b"),
      brandMuted: normalizeHex(e.NEXT_PUBLIC_BRAND_MUTED, "#666666"),
      ink900: normalizeHex(e.NEXT_PUBLIC_COLOR_INK_900, "#0e1521"),
      ink800: normalizeHex(e.NEXT_PUBLIC_COLOR_INK_800, "#232c3a"),
      ink700: normalizeHex(e.NEXT_PUBLIC_COLOR_INK_700, "#3d4654"),
      ink600: normalizeHex(e.NEXT_PUBLIC_COLOR_INK_600, "#5c6675"),
      ink400: normalizeHex(e.NEXT_PUBLIC_COLOR_INK_400, "#8c95a3"),
      ink300: normalizeHex(e.NEXT_PUBLIC_COLOR_INK_300, "#c2c8d0"),
      ink200: normalizeHex(e.NEXT_PUBLIC_COLOR_INK_200, "#dde1e6"),
      ink100: normalizeHex(e.NEXT_PUBLIC_COLOR_INK_100, "#eef0f2"),
      ink50: normalizeHex(e.NEXT_PUBLIC_COLOR_INK_50, "#f7f8f9"),
      success600: normalizeHex(e.NEXT_PUBLIC_COLOR_SUCCESS_600, "#18804c"),
      success500: normalizeHex(e.NEXT_PUBLIC_COLOR_SUCCESS_500, "#21a765"),
      success400: normalizeHex(e.NEXT_PUBLIC_COLOR_SUCCESS_400, "#2bcc7e"),
      error700: normalizeHex(e.NEXT_PUBLIC_COLOR_ERROR_700, "#a8341f"),
      error600: normalizeHex(e.NEXT_PUBLIC_COLOR_ERROR_600, "#c2402b"),
      warning600: normalizeHex(e.NEXT_PUBLIC_COLOR_WARNING_600, "#b26a00"),
    },
    features: {
      searchEnabled: e.NEXT_PUBLIC_SEARCH_ENABLED === "true",
      filterItems: e.NEXT_PUBLIC_FILTER_ITEMS ?? "",
      extensionsExcluded: (e.NEXT_PUBLIC_EXTENSIONS_EXCLUDED ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    },
    payments: {
      stripePublishableKey: e.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
      stripeAccountId: e.NEXT_PUBLIC_STRIPE_ACCOUNT_ID || undefined,
      paypalEnabled: e.NEXT_PUBLIC_PAYPAL_ENABLED === "true",
    },
    ui: {
      defaultCartMode:
        (e.NEXT_PUBLIC_DEFAULT_CART_MODE as "drawer" | "full" | undefined) ??
        "drawer",
      defaultShoppingMode: shoppingModeLocked
        ? "b2c"
        : ((e.NEXT_PUBLIC_DEFAULT_SHOPPING_MODE as "b2c" | "b2b" | undefined) ??
          "b2c"),
      shoppingModeLocked,
      cartViewMode:
        (e.NEXT_PUBLIC_CART_VIEW_MODE as "list" | "grid" | undefined) ?? "list",
    },
    analytics: {
      posthogKey: e.NEXT_PUBLIC_POSTHOG_KEY ?? "",
      posthogHost: e.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    },
  };
}

// The external config API's actual JSON shape is unknown ahead of time —
// this function is the single seam that maps it onto TenantConfig, with
// buildTenantConfigFromEnv()'s defaults filling in anything missing/invalid.
function normalizeTenantConfig(raw: Record<string, unknown>): TenantConfig {
  const defaults = buildTenantConfigFromEnv();
  const r = raw as Partial<{
    epcc: Partial<TenantConfig["epcc"]>;
    security: Partial<TenantConfig["security"]>;
    auth: Partial<TenantConfig["auth"]>;
    currency: Partial<TenantConfig["currency"]>;
    inventory: Partial<TenantConfig["inventory"]>;
    requestHeaders: Partial<TenantConfig["requestHeaders"]>;
    cms: Partial<TenantConfig["cms"]>;
    site: Partial<TenantConfig["site"]>;
    theme: Partial<ThemeConfig>;
    features: Partial<TenantConfig["features"]>;
    payments: Partial<TenantConfig["payments"]>;
    ui: Partial<TenantConfig["ui"]>;
    analytics: Partial<TenantConfig["analytics"]>;
  }>;

  const theme = { ...defaults.theme } as ThemeConfig;
  for (const key of Object.keys(theme) as Array<keyof ThemeConfig>) {
    const val = r.theme?.[key];
    if (typeof val === "string" && val)
      theme[key] = normalizeHex(val, defaults.theme[key]);
  }

  const endpointUrl = r.epcc?.endpointUrl || defaults.epcc.endpointUrl;
  const shoppingModeLocked = endpointUrl.includes("elasticpath.com");

  return {
    epcc: {
      endpointUrl,
      clientId: r.epcc?.clientId || defaults.epcc.clientId,
    },
    security: {
      gatekeeperPassword:
        r.security?.gatekeeperPassword ?? defaults.security.gatekeeperPassword,
    },
    auth: {
      passwordProfileId:
        r.auth?.passwordProfileId || defaults.auth.passwordProfileId,
      oidcProfileIds:
        r.auth?.oidcProfileIds?.length
          ? r.auth.oidcProfileIds
          : defaults.auth.oidcProfileIds,
    },
    currency: {
      default: r.currency?.default || defaults.currency.default,
      available: r.currency?.available?.length
        ? r.currency.available
        : defaults.currency.available,
    },
    inventory: {
      multiLocation:
        r.inventory?.multiLocation ?? defaults.inventory.multiLocation,
    },
    requestHeaders: {
      epContextTag:
        r.requestHeaders?.epContextTag ?? defaults.requestHeaders.epContextTag,
      environmentId:
        r.requestHeaders?.environmentId ?? defaults.requestHeaders.environmentId,
      storeId: r.requestHeaders?.storeId ?? defaults.requestHeaders.storeId,
    },
    cms: {
      projectId: r.cms?.projectId ?? defaults.cms.projectId,
      apiToken: r.cms?.apiToken ?? defaults.cms.apiToken,
      preview: r.cms?.preview ?? defaults.cms.preview,
    },
    site: {
      name: r.site?.name || defaults.site.name,
      title: r.site?.title || defaults.site.title,
      description: r.site?.description ?? defaults.site.description,
    },
    theme,
    features: {
      searchEnabled:
        r.features?.searchEnabled ?? defaults.features.searchEnabled,
      filterItems: r.features?.filterItems ?? defaults.features.filterItems,
      extensionsExcluded: r.features?.extensionsExcluded?.length
        ? r.features.extensionsExcluded
        : defaults.features.extensionsExcluded,
    },
    payments: {
      stripePublishableKey:
        r.payments?.stripePublishableKey ??
        defaults.payments.stripePublishableKey,
      stripeAccountId:
        r.payments?.stripeAccountId ?? defaults.payments.stripeAccountId,
      paypalEnabled:
        r.payments?.paypalEnabled ?? defaults.payments.paypalEnabled,
    },
    ui: {
      defaultCartMode: r.ui?.defaultCartMode ?? defaults.ui.defaultCartMode,
      defaultShoppingMode: shoppingModeLocked
        ? "b2c"
        : r.ui?.defaultShoppingMode ?? defaults.ui.defaultShoppingMode,
      shoppingModeLocked,
      cartViewMode: r.ui?.cartViewMode ?? defaults.ui.cartViewMode,
    },
    analytics: {
      posthogKey: r.analytics?.posthogKey ?? defaults.analytics.posthogKey,
      posthogHost: r.analytics?.posthogHost ?? defaults.analytics.posthogHost,
    },
  };
}

/**
 * Splits a hostname into its subdomain and root domain, e.g.
 * "acron.mystorefront.com" -> { subdomain: "acron", domain: "mystorefront.com" }.
 * A bare two-label (or shorter) host has no subdomain, e.g.
 * "mystorefront.com" -> { subdomain: "", domain: "mystorefront.com" }.
 * This is a simple first-label split, not a public-suffix-list lookup — it
 * won't correctly separate multi-part TLDs (e.g. "co.uk"), which is fine for
 * tenant domains but worth knowing if custom domains ever need that.
 */
function splitHostname(hostname: string): { domain: string; subdomain: string } {
  const labels = hostname.split(".");
  if (labels.length <= 2) return { domain: hostname, subdomain: "" };
  return { subdomain: labels[0], domain: labels.slice(1).join(".") };
}

async function fetchTenantConfigFromApi(
  hostname: string,
): Promise<Record<string, unknown> | null> {
  const base = process.env.TENANT_CONFIG_API_URL;
  if (!base) return null;
  try {
    const { domain, subdomain } = splitHostname(hostname);
    const url = new URL(`${base}/tenants/${encodeURIComponent(hostname)}/config`);
    url.searchParams.set("domain", domain);
    url.searchParams.set("subdomain", subdomain);
    const res = await fetch(url, {
      headers: process.env.TENANT_CONFIG_API_KEY
        ? { Authorization: `Bearer ${process.env.TENANT_CONFIG_API_KEY}` }
        : undefined,
      next: {
        revalidate: 60,
        tags: [`tenant-config:${hostname}`],
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null; // never let a config-API outage take the storefront down
  }
}

async function resolveTenantConfigForHostname(
  hostname: string,
): Promise<TenantConfig> {
  if (process.env.MULTI_TENANT_MODE !== "true") {
    return buildTenantConfigFromEnv();
  }
  if (!hostname) return buildTenantConfigFromEnv();
  const raw = await fetchTenantConfigFromApi(hostname);
  return raw ? normalizeTenantConfig(raw) : buildTenantConfigFromEnv();
}

/**
 * Resolves the current request's tenant config. Deduped per-request via
 * React's cache() — safe to call from many files in the same render.
 * Server Components / Route Handlers / Server Actions only — relies on
 * next/headers, which isn't available in Middleware (see
 * getTenantConfigForHostname below for that case).
 *
 * MULTI_TENANT_MODE=true switches from env-var config to a per-hostname
 * fetch against TENANT_CONFIG_API_URL; unset/false keeps today's
 * single-tenant, env-var-only behavior with no network call at all.
 */
export const getTenantConfig = cache(async (): Promise<TenantConfig> => {
  const hostname = await getRequestHostname();
  return resolveTenantConfigForHostname(hostname);
});

/**
 * Same resolution logic as getTenantConfig(), but takes the hostname
 * directly instead of reading it via next/headers — for Middleware
 * (src/proxy.ts), which has its own NextRequest.headers and can't use the
 * next/headers APIs. Not cache()-wrapped: middleware calls this once per
 * request, so there's nothing to dedupe.
 */
export async function getTenantConfigForHostname(
  hostname: string,
): Promise<TenantConfig> {
  return resolveTenantConfigForHostname(hostname);
}
