# Analytics & Access Control Functional Document

What the storefront supports for measuring usage and restricting access.

## Product analytics (PostHog)

- Optional — enabled by setting a PostHog project API key; if unset, the analytics SDK isn't loaded at all, with no performance cost.
- Automatically captures page views (including client-side navigations) and page-leave events with no extra code, plus a small helper API for custom events.
- Shoppers are identified by their account on login and reset on logout, so events can be tied to a known shopper across a session without leaking identity across shared devices.
- Analytics requests are proxied through the storefront's own domain rather than calling PostHog directly, so ad blockers that target third-party analytics domains don't silently drop events.
- The PostHog region (US or EU) is configurable to match where the PostHog project itself is hosted.

## Web performance analytics (Vercel)

- Vercel Analytics is included by default when deployed on Vercel, capturing Core Web Vitals and performance metrics with no application-level configuration — it's enabled/managed from the Vercel dashboard.

## Site-wide access gate

- An optional password wall in front of the entire storefront, independent of shopper accounts — intended for gating a staging or preview deployment rather than for production use.
- When configured, every page redirects to a password prompt until the correct password is entered; the grant persists for the browser session via a cookie.
- Leaving the password unset disables the gate entirely, with zero effect on normal site behavior.

## Related documents

- [account.md](account.md) — shopper-level authentication, which is separate from this site-wide gate
