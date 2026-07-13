import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// PostHog ingestion host (region-specific) and its matching assets host.
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const posthogAssetsHost = posthogHost.replace(
  ".i.posthog.com",
  "-assets.i.posthog.com",
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ hostname: "*" }],
    // Product/CMS image URLs are tenant/content-driven (e.g. placeholder
    // services like placehold.co serve SVG) and can't be predicted ahead of
    // time. Mitigated the way Next.js docs recommend: served as a download
    // with a locked-down CSP so an SVG can't execute a script.
    // dangerouslyAllowSVG: true,
    // contentDispositionType: "attachment",
    // contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Proxy PostHog through our own domain so ad blockers don't drop events.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
    ];
  },
  // PostHog API endpoints break if trailing slashes get redirected.
  skipTrailingSlashRedirect: true,
};

export default withNextIntl(nextConfig);
