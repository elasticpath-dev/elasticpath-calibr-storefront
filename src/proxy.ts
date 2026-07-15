import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./lib/routing";
import { getTenantConfigForHostname } from "@/lib/tenant-config";

const GATE_COOKIE = "ep_gatekeeper";
const GATE_PATH = "/gate";

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
  const { security } = await getTenantConfigForHostname(hostname);
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
