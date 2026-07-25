# Storefront — Capabilities Catalog

A catalog of what the storefront can do, organized by capability area. Each doc
leads with a plain-language **Capabilities** list (what exists), then
**Configuration** (the environment variables / tenant-config switches that change
it, with defaults), then **Behaviour scenarios** in Gherkin/BDD for the detail,
and a **Quick reference** cheat sheet.

Use it to understand what's built and how to configure it, without reading the code.

## Areas

| Doc | Covers |
|---|---|
| [catalog-and-products.md](catalog-and-products.md) | Listing & navigation, PDP, variations, bundles, bulk-buy pricing, digital products, custom inputs, catalog search, Quick View, inventory, currency-aware pricing |
| [cart.md](cart.md) | Drawer + full cart, list/grid views, line-item types, grouping & editable inputs, promotions, multi-cart (requisitions), totals, checkout CTA |
| [checkout.md](checkout.md) | Two-step checkout: B2C/B2B delivery & shipping methods, billing, digital-only orders, payment methods (Stripe/EP Payments, PayPal, COD, PO), confirmation |
| [account.md](account.md) | Authentication, multi-account (B2B), personal details, address book, site-wide access gate |
| [orders.md](orders.md) | Order history, status badges, reorder, order detail |
| [quotes.md](quotes.md) | Requesting a quote from the cart, quote history & detail (B2B) |
| [subscriptions.md](subscriptions.md) | Purchasing a subscription, managing (pause/resume/cancel), invoices |
| [localization.md](localization.md) | Language, currency, shopping mode (B2C/B2B) & the EP-hosted lock |
| [analytics-and-access.md](analytics-and-access.md) | PostHog & Vercel analytics, site-wide password gate, require-login |
| [branding-and-cms.md](branding-and-cms.md) | Env-driven branding (identity, colours, logo) & Elastic Path CMS (Plasmic) |

> All configuration switches resolve through `src/lib/tenant-config.ts`. In
> multi-tenant mode (`MULTI_TENANT_MODE=true`) the same fields can be provided
> per-hostname by the remote config endpoint instead of `NEXT_PUBLIC_*` env vars.
