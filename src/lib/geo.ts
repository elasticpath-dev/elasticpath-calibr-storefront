/**
 * Shopper country (ISO-3166 alpha-2, e.g. "US") resolved from the edge geo
 * header (x-vercel-ip-country on Vercel, CloudFront-Viewer-Country behind
 * CloudFront) and written to the `ep_country` cookie by the proxy so it's
 * readable client-side — used as a Plasmic targeting trait alongside language
 * and catalog id (see PlasmicContent).
 */
export const COUNTRY_COOKIE = "ep_country";

/** Client-side read of the resolved country cookie. Null on the server. */
export function readCountryCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)ep_country=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
