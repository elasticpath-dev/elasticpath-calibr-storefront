# Account Functional Document

What the storefront supports for shopper authentication and self-service account management.

## Authentication

- **Login** and **self-registration** (name, email, password) via Elastic Path's Account Management API, which issues a bearer token per account the member belongs to.
- **Password reset** has a placeholder entry point pending realm-level OTP configuration in Elastic Path — not currently functional end to end.
- Sessions persist in the browser; expired tokens are discarded automatically on load.
- Both guest and authenticated shopping are supported throughout the storefront (see [cart.md](cart.md) and [checkout.md](checkout.md) for where the two paths diverge).

## Multi-account membership (B2B)

- A single member can belong to more than one B2B account. Logging in returns tokens for every account they belong to.
- When a member has multiple accounts, an account switcher appears in the header account menu and on the Personal page, listing account names with the active one marked.
- Switching accounts updates the active account context for every subsequent authenticated API call (addresses, orders, carts, subscriptions, quotes are all account-scoped).

## Account menu & pages

The header account dropdown links to:

| Page | Purpose |
|---|---|
| **Personal** | Member name/email, selected account name and ID, account switcher (if applicable) |
| **Addresses** | Saved address book |
| **Carts** | Multi-cart / requisition list management — see [cart.md](cart.md) |
| **Orders** | Order history and detail — see [orders.md](orders.md) |
| **Subscriptions** | Active/paused subscriptions — see [subscriptions.md](subscriptions.md) |
| **Quotes** | Submitted quote requests — see [quotes.md](quotes.md) |

## Address book

- Full CRUD on saved addresses: first/last name, company (optional), address lines, city, county, postcode, country.
- Saved addresses are available for reuse at checkout for both shipping and billing.

## Site-wide access gate

Separate from shopper accounts: an optional password gate (`GATEKEEPER_PASSWORD`) can sit in front of the entire site — typically used to protect a staging or preview deployment. When set, every page redirects to a password page until the correct password is entered; the grant is remembered for the session via a cookie.

## Related documents

- [orders.md](orders.md) — order history and detail
- [subscriptions.md](subscriptions.md) — subscription management
- [quotes.md](quotes.md) — quote history
- [cart.md](cart.md) — saved-cart management
- [checkout.md](checkout.md) — how saved addresses and account identity are used at checkout
