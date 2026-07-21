/**
 * Shared helpers for the shopper's selected multi-location inventory location.
 * The chosen location slug lives in the `ep_location` cookie so it survives
 * navigation and is readable by both the selector (settings drawer) and the
 * cart (add-to-cart `location`) / stock lookups.
 */
export const LOCATION_COOKIE = "ep_location";

export function readLocationCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)ep_location=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function writeLocationCookie(slug: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCATION_COOKIE}=${encodeURIComponent(
    slug,
  )}; path=/; max-age=31536000; SameSite=Strict`;
}
