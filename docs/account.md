# Account

What the storefront supports for shopper authentication and self-service account
management. Orders, quotes and subscriptions each have their own doc.

- **Base route:** `/{lang}/account` → redirects to `/{lang}/account/personal`
- **Tabs:** Personal · Addresses · Carts · Orders · Quotes · Subscriptions
- **Primary source files:** `src/app/[lang]/(app)/account/*`,
  `src/components/account/AccountPageContent.tsx`, `src/components/account/tabs/*`,
  `src/hooks/use-account-addresses.ts`, `src/context/AuthContext.tsx`

> The whole account area requires being signed in. **No feature flags gate any
> tab** — all render for any authenticated account member. Access is controlled
> by auth state (a selected account), not config.

---

## Capabilities

### Authentication
- **Login** and **self-registration** (name, email, password) via Elastic Path's Account Management API, which issues a bearer token per account the member belongs to.
- **Password reset** has a placeholder entry point pending realm-level OTP configuration in EP — not currently functional end to end.
- Sessions persist in the browser; expired tokens are discarded automatically on load.
- Both guest and authenticated shopping are supported throughout (see [cart.md](cart.md) / [checkout.md](checkout.md) for where the paths diverge).

### Multi-account membership (B2B)
- A member can belong to more than one B2B account; logging in returns tokens for every account.
- With multiple accounts, an account switcher appears in the header menu and on the Personal page (active one marked).
- Switching accounts re-scopes every subsequent authenticated call — addresses, orders, carts, subscriptions and quotes are all account-scoped.

### Account menu & pages
| Page | Purpose |
|---|---|
| **Personal** | Member name/email, selected account name + ID, account switcher (if applicable). Read-only profile. |
| **Addresses** | Saved address book. |
| **Carts** | Multi-cart / requisition list management — see [cart.md](cart.md). |
| **Orders** | Order history + detail — see [orders.md](orders.md). |
| **Quotes** | Submitted quote requests — see [quotes.md](quotes.md). |
| **Subscriptions** | Active/paused subscriptions — see [subscriptions.md](subscriptions.md). |

### Address book
- Full CRUD on saved addresses: first/last name, company (optional), address lines, city, county, postcode, country.
- Saved addresses are reusable at checkout for both shipping and billing.
- There is **no** "default shipping/billing" designation.

### Site-wide access gate
- Separate from shopper accounts: an optional password gate (`GATEKEEPER_PASSWORD`) can sit in front of the entire site — typically to protect a staging/preview deployment. When set, every page redirects to a password page until entered; the grant is remembered for the session via a cookie. See [analytics-and-access.md](analytics-and-access.md).

---

## Configuration

There are **no** account-specific env flags — account data is scoped to the
signed-in member's token and gated by auth state.

| Env var | Values | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_PASSWORD_PROFILE_ID` | string | `""` | Shopper login profile. |
| `NEXT_PUBLIC_OIDC_PROFILE_IDS` | comma-list | `[]` | SSO login profiles. |
| `REQUIRE_LOGIN` (server) | `true`/`false` | `false` | Forces sign-in before any page (no anonymous browsing). |
| `GATEKEEPER_PASSWORD` (server) | string | `""` | Optional site-wide password gate (staging/preview). |

**Per-shopper state:** account-member credentials (localStorage `ep_account_member_credentials` + cookie `ep_am_token`); selected account (B2B switch re-scopes all account data).

---

## Behaviour scenarios (BDD)

```gherkin
Feature: Access & navigation

  Scenario: Signed-out redirect
    Given I am not signed in
    When I open any "/{lang}/account/..." page
    Then I am redirected to the home page

  Scenario: Default tab
    When I open "/{lang}/account"
    Then I land on "/{lang}/account/personal"
```

```gherkin
Feature: Personal & account switching

  Scenario: Profile
    Then I see my member name, email, account name and ID (read-only)

  Scenario: Switch accounts (B2B)
    Given my member belongs to more than one account
    When I select another account
    Then the app re-scopes to it and refreshes
```

```gherkin
Feature: Addresses

  Scenario: CRUD
    Then I can add, edit and delete saved addresses (delete requires confirmation)
    And required fields are validated (first/last name, line 1, city, county, postcode, country)
    But there is no "set as default" option
```

```gherkin
Feature: Site-wide access gate
  # Switch: GATEKEEPER_PASSWORD

  Scenario: Gate enabled
    Given a gatekeeper password is set
    Then every page redirects to a password prompt until it's entered (remembered for the session)
```

---

## Quick reference

| Area | Route | Key behaviour |
|---|---|---|
| Personal | `/account/personal` | Read-only profile + B2B account switcher (when >1 account) |
| Addresses | `/account/addresses` | Add/edit/delete saved addresses (no default designation) |
| Carts | `/account/carts` | Manage saved carts — see [cart.md](cart.md) |
| Orders | `/account/orders` | See [orders.md](orders.md) |
| Quotes | `/account/quotes` | See [quotes.md](quotes.md) |
| Subscriptions | `/account/subscriptions` | See [subscriptions.md](subscriptions.md) |

**Related:** [orders.md](orders.md) · [quotes.md](quotes.md) · [subscriptions.md](subscriptions.md) · [cart.md](cart.md) · [checkout.md](checkout.md)
