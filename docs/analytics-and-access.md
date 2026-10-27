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

### Preview mode
- A tenant flag that marks the storefront as a preview store: an amber **announcement bar** above the header on every page carries a "Preview Mode" label and a short notice, so nobody mistakes the site for production.
- The same bar holds the **Preview Cart** control: pick a future date and time and the active cart's `snapshot_date` is set, so Elastic Path prices the cart and applies promotions as of that moment. The control shows the active preview date, and offers to start a fresh cart since a cart with a snapshot date cannot be checked out.
- The flag can come from env or the tenant-config endpoint; off by default. See **[cart.md](cart.md)** for the cart side.

---

## Configuration

| Env var | Values | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | `""` | Enables PostHog. Unset → analytics SDK not loaded. (Can also come from the tenant-config endpoint.) |
| `NEXT_PUBLIC_POSTHOG_HOST` | URL | `https://eu.i.posthog.com` | PostHog region/host. |
| `GATEKEEPER_PASSWORD` (server) | string | `""` | Site-wide password gate. Unset → no gate. |
| `REQUIRE_LOGIN` (server) | `true`/`false` | `false` | Forces sign-in before any page. |
| `NEXT_PUBLIC_PREVIEW_MODE` | `true`/`false` | `false` | Preview store: "Preview Mode" announcement bar above the header on every page, with the Preview Cart (snapshot date) control. |

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

```gherkin
Feature: Preview mode
  # Switch: NEXT_PUBLIC_PREVIEW_MODE (or tenant-config features.previewMode)

  Scenario: Announcement bar
    Given preview mode is on
    Then every page shows an announcement bar above the header with a "Preview Mode" label and notice

  Scenario: Preview cart date
    Given preview mode is on and Elastic Path APIs are available
    When I open Preview Cart in the announcement bar and pick a future date and time
    Then the active cart's snapshot_date is set and the cart re-prices as of that moment
    And the header control shows the active preview date

  Scenario: Past date
    When I pick a date and time that is not in the future
    Then nothing is sent and an error toast explains why

  Scenario: Leave preview
    Given the cart has a preview date
    When I choose "Start a new cart"
    Then a fresh cart without a snapshot date becomes active
```

---

## Quick reference

| Want to… | Set |
|---|---|
| Enable PostHog analytics | `NEXT_PUBLIC_POSTHOG_KEY=…` (+ `NEXT_PUBLIC_POSTHOG_HOST` for region) |
| Password-protect a preview deploy | `GATEKEEPER_PASSWORD=…` |
| Disallow anonymous browsing | `REQUIRE_LOGIN=true` |
| Mark the site as a preview store (announcement bar + Preview Cart) | `NEXT_PUBLIC_PREVIEW_MODE=true` |

**Related:** [account.md](account.md) (shopper authentication, separate from the site gate)
