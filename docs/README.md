# Storefront — Page Functional Specifications

BDD-style (Behaviour-Driven Development) functional specs for the storefront's
key pages. Each doc describes **what the page does** and the **environment
variables / tenant-config switches** that change its behaviour, so a non-author
can understand what's built and how to configure it.

Each doc follows the same shape: intro + routes + source files, an environment-
variable reference (with defaults), Gherkin `Feature`/`Scenario` behaviour specs
grouped by area, and a quick-reference cheat sheet.

## Pages

| Doc | Covers |
|---|---|
| [category-page.md](category-page.md) | Category listing: search-backed vs static grid, filters, sorting, pagination/infinite scroll, product cards, inventory gating, bulk add |
| [cart-page.md](cart-page.md) | Drawer + full cart, list/grid views, multi-cart/requisitions, line items, grouping & editable inputs, promotions, totals, states |
| [checkout-shipping.md](checkout-shipping.md) | Checkout step 1: contact info, addresses (B2C single vs B2B multi-shipment), billing, shipping methods, proceed-to-payment gating |
| [checkout-payment.md](checkout-payment.md) | Checkout step 2: payment methods (Stripe/EP Payments, PayPal, COD, PO), order placement, confirmation, errors |
| [account-page.md](account-page.md) | Account tabs: personal/account-switch, addresses, orders, carts, quotes, subscriptions |

> All configuration switches ultimately resolve through `src/lib/tenant-config.ts`.
> In multi-tenant mode (`MULTI_TENANT_MODE=true`) the same fields can be provided
> per-hostname by the remote config endpoint instead of `NEXT_PUBLIC_*` env vars.
