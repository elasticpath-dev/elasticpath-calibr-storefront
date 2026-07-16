import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./lib/routing";
import { getTenantConfigForHostname } from "@/lib/tenant-config";

const GATE_COOKIE = "ep_gatekeeper";
const GATE_PATH = "/gate";
const AM_TOKEN_COOKIE = "ep_am_token";
const LOGIN_REQUIRED_SEGMENT = "login-required";

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always let the gate page and its actions through — prevents redirect loop
  if (pathname.startsWith(GATE_PATH)) {
    return NextResponse.next();
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

  return intlMiddleware(request);
}

export const config = {
  // "ingest" is the PostHog reverse proxy (next.config rewrites) — the
  // locale middleware must not redirect it to /en/ingest.
  // "oidc" is the OIDC provider's static callback route (generateRedirectUri()
  // registers it as a bare, locale-less URL) — prefixing it to /en/oidc would
  // 404 since the page lives outside [lang].
  matcher: ["/((?!_next|api|ingest|favicon.ico|plasmic-host|oidc|.*\\..*).*)"],
};
