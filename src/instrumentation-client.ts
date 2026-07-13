import posthog from "posthog-js";

// Loaded by Next.js before the app hydrates. No-op unless a PostHog
// key is configured.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    // Proxied through Next rewrites (see next.config.ts) so requests
    // aren't blocked by ad blockers.
    api_host: "/ingest",
    // Must match the default in next.config.ts's rewrite, or events get
    // proxied to a different region than the SDK thinks it's talking to.
    ui_host: (
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com"
    ).replace(".i.posthog.com", ".posthog.com"),
    // Opt into current SDK behavior: automatic pageview capture on
    // App Router client-side navigations, pageleave events, etc.
    defaults: "2025-05-24",
  });
}
