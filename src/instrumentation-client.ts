import { initAnalytics } from "@/lib/analytics";

// Loaded by Next.js before the app hydrates. Initializes PostHog early when a
// build-time key is present; otherwise it's a no-op and AnalyticsInit picks it
// up from the runtime tenant config (the usual source here). initAnalytics is
// guarded so only the first caller wins.
initAnalytics(
  process.env.NEXT_PUBLIC_POSTHOG_KEY,
  process.env.NEXT_PUBLIC_POSTHOG_HOST,
);
