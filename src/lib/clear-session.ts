const COOKIE_MAX_AGE_ZERO = "expires=Thu, 01 Jan 1970 00:00:00 GMT";

function expireCookie(name: string) {
  document.cookie = `${name}=; path=/; ${COOKIE_MAX_AGE_ZERO}`;
}

/**
 * Wipes all EP-related session data from localStorage and cookies.
 * Call on logout or whenever a full session reset is needed.
 */
export function clearSession() {
  // ── localStorage ────────────────────────────────────────────────────────────
  const prefixesToRemove = ["ep-shipment-names-", "ep-shipment-estimates-"];
  const exactKeysToRemove = [
    "_store_ep_cart",
    "_store_ep_credentials", // SDK client access-token store
    "ep_account_member_credentials",
    "elasticpath_cart",
  ];

  for (const key of exactKeysToRemove) {
    localStorage.removeItem(key);
  }

  for (const key of Object.keys(localStorage)) {
    if (prefixesToRemove.some((p) => key.startsWith(p))) {
      localStorage.removeItem(key);
    }
  }

  // ── Cookies ──────────────────────────────────────────────────────────────────
  expireCookie("ep_cart_id");
  expireCookie("elasticpath_cart");
  expireCookie("ep_am_token");
  expireCookie("ep_catalog_id"); // resolved catalog cache — must reset on logout
}
