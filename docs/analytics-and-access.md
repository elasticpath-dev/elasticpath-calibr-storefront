# Analytics & Access Control

What the storefront supports for measuring usage and restricting access.

- **Primary source files:** `src/lib/analytics.ts`, `src/components/AnalyticsInit.tsx`,
  `src/instrumentation-client.ts`, `next.config` (`/ingest` rewrite), `src/proxy.ts`,
  the gate page under `src/app/gate/*`

---

## Capabilities

### Product analytics (PostHog)
- Optional — enabled by providing a PostHog project API key; if unset, the analytics SDK isn't loaded at all (no performance cost).
- Automatically captures page views (including client-side navigations) and page-leave events, plus a small helper API for custom events.
- Shoppers are identified by their account on login and reset on logout, so events tie to a known shopper within a session without leaking identity across shared devices.
- Analytics requests are proxied through the storefront's own domain (`/ingest`), so ad blockers targeting third-party analytics domains don't silently drop events.
- The PostHog region (US or EU) is configurable to match where the project is hosted.
- The key and host can come from the **tenant-config endpoint** at runtime, not only from build-time env.

### Web performance analytics (Vercel)
- Vercel Analytics is included by default when deployed on Vercel, capturing Core Web Vitals with no application-level configuration — managed from the Vercel dashboard.

### Site-wide access gate
- An optional password wall in front of the entire storefront, independent of shopper accounts — intended for gating a staging/preview deployment, not production.
- When configured, every page redirects to a password prompt until the correct password is entered; the grant persists for the browser session via a cookie.
- Leaving the password unset disables the gate entirely, with zero effect on normal behaviour.

### Require login
- Separately, the store can require authentication before any page (no anonymous browsing).

---

## Configuration

| Env var | Values | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | `""` | Enables PostHog. Unset → analytics SDK not loaded. (Can also come from the tenant-config endpoint.) |
| `NEXT_PUBLIC_POSTHOG_HOST` | URL | `https://eu.i.posthog.com` | PostHog region/host. |
| `GATEKEEPER_PASSWORD` (server) | string | `""` | Site-wide password gate. Unset → no gate. |
| `REQUIRE_LOGIN` (server) | `true`/`false` | `false` | Forces sign-in before any page. |

**Per-shopper state:** gate-grant cookie (session); `ep_am_token` cookie (sign-in).

---

## Behaviour scenarios (BDD)

```gherkin
Feature: Product analytics
  # Switch: NEXT_PUBLIC_POSTHOG_KEY (or tenant-config)

  Scenario: Enabled
    Given a PostHog key is configured
    Then page views and leaves are captured, identified by account on login and reset on logout
    And requests are proxied through the storefront domain

  Scenario: Disabled
    Given no PostHog key
    Then the analytics SDK is not loaded at all
```

```gherkin
Feature: Access control

  Scenario: Site-wide gate
    # Switch: GATEKEEPER_PASSWORD
    Given a gatekeeper password is set
    Then every page redirects to a password prompt until entered (remembered for the session)

  Scenario: Require login
    # Switch: REQUIRE_LOGIN
    Given require-login is on
    Then every page redirects to sign-in unless authenticated
```

---

## Quick reference

| Want to… | Set |
|---|---|
| Enable PostHog analytics | `NEXT_PUBLIC_POSTHOG_KEY=…` (+ `NEXT_PUBLIC_POSTHOG_HOST` for region) |
| Password-protect a preview deploy | `GATEKEEPER_PASSWORD=…` |
| Disallow anonymous browsing | `REQUIRE_LOGIN=true` |

**Related:** [account.md](account.md) (shopper authentication, separate from the site gate)
