import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./lib/routing";
import {
  getTenantConfigForHostname,
  CONTEXT_TAG_COOKIE,
} from "@/lib/tenant-config";
import { COUNTRY_COOKIE } from "@/lib/geo";

const GATE_COOKIE = "ep_gatekeeper";
const GATE_PATH = "/gate";
const AM_TOKEN_COOKIE = "ep_am_token";
const LOGIN_REQUIRED_SEGMENT = "login-required";
// Literal (also lives in catalog.ts / CatalogContext) — cleared when the tag
// changes so the catalog id re-resolves under the new context.
const CATALOG_ID_COOKIE = "ep_catalog_id";

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always let the gate page and its actions through — prevents redirect loop
  if (pathname.startsWith(GATE_PATH)) {
    return NextResponse.next();
  }

  // `?tag=` on any page overrides the EP-Context-Tag: capture it into a cookie,
  // then redirect to the same URL without the param so the page renders with
  // the tag already in place (getTenantConfig reads the cookie). An empty
  // `?tag=` clears the override (back to the configured default).
  if (request.nextUrl.searchParams.has("tag")) {
    const tag = (request.nextUrl.searchParams.get("tag") ?? "").trim();
    const url = request.nextUrl.clone();
    url.searchParams.delete("tag");
    const res = NextResponse.redirect(url);
    if (tag) {
      res.cookies.set(CONTEXT_TAG_COOKIE, tag, {
        path: "/",
        sameSite: "lax",
        maxAge: 31536000,
      });
    } else {
      res.cookies.delete(CONTEXT_TAG_COOKIE);
    }
    // The tag can change which catalog resolves — drop the cached catalog id so
    // it re-resolves under the new context on the next render.
    res.cookies.delete(CATALOG_ID_COOKIE);
    return res;
  }

  const hostname = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(":")[0]
    .toLowerCase()
    .trim();
  const { security, auth } = await getTenantConfigForHostname(hostname);
  const password = security.gatekeeperPassword;
  if (password) {
    const cookie = request.cookies.get(GATE_COOKIE);
    if (cookie?.value !== "granted") {
      const url = request.nextUrl.clone();
      url.pathname = GATE_PATH;
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // No anonymous browsing for this tenant — every page requires a signed-in
  // shopper. ep_am_token is a plain (non-httpOnly) cookie AuthContext sets
  // alongside its localStorage credentials, so it rides along on every
  // request and the browser itself drops it once the account token expires
  // (its `expires` matches) — presence alone is enough here.
  if (auth.requireLogin) {
    const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
    const locale =
      localeMatch && (routing.locales as readonly string[]).includes(localeMatch[1])
        ? localeMatch[1]
        : routing.defaultLocale;
    const loginRequiredPath = `/${locale}/${LOGIN_REQUIRED_SEGMENT}`;

    if (pathname !== loginRequiredPath && !request.cookies.get(AM_TOKEN_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = loginRequiredPath;
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = intlMiddleware(request);

  // Expose the edge-resolved shopper country to the client (Plasmic country
  // trait). Written only when it changes so we don't Set-Cookie on every hit.
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cloudfront-viewer-country") ??
    "";
  if (country && request.cookies.get(COUNTRY_COOKIE)?.value !== country) {
    response.cookies.set(COUNTRY_COOKIE, country, {
      path: "/",
      sameSite: "lax",
      maxAge: 31536000,
    });
  }

  return response;
}

export const config = {
  // "ingest" is the PostHog reverse proxy (next.config rewrites) — the
  // locale middleware must not redirect it to /en/ingest.
  // "oidc" is the OIDC provider's static callback route (generateRedirectUri()
  // registers it as a bare, locale-less URL) — prefixing it to /en/oidc would
  // 404 since the page lives outside [lang].
  matcher: ["/((?!_next|api|ingest|favicon.ico|plasmic-host|oidc|.*\\..*).*)"],
};
