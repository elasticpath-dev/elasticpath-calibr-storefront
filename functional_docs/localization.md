# Localization Functional Document

What the storefront supports for language, currency, and shopping-mode preferences.

## Language

- Three supported locales: English, French, Spanish — each URL is prefixed with the locale segment (e.g. `/en/products`, `/fr/products`).
- Shoppers switch language from the header settings drawer; switching navigates to the same page under the new locale segment.
- Translations are organized into per-feature namespaces (header, cart, checkout, account, product, etc.) in one JSON file per locale.
- The supported locale set is fixed in configuration, not environment-driven — adding a locale is a code change, not a deployment setting.

## Currency

- Shoppers select a currency from a header dropdown; the choice persists in a cookie and applies to every price shown across the site (catalog, search, cart, checkout).
- `NEXT_PUBLIC_DEFAULT_CURRENCY` sets the default/fallback currency (required to configure correctly — it must match a currency your catalog's price book actually has prices in, or products show blank prices).
- `NEXT_PUBLIC_CURRENCIES` sets the list offered in the dropdown; omitting it entirely means single-currency mode with no dropdown shown.
- Changing currency triggers a full refresh of the page (and a client-side remount) so every cached price — including the cart and any open catalog listings — reflects the new currency consistently, rather than leaving some elements showing stale prices.
- If the cart already has items when currency is changed, the shopper is prompted to either start a new cart or clear the current one, since prices captured in the old currency shouldn't silently carry over.
- Bulk-buy tier pricing (see [catalog.md](catalog.md)) only displays when the product is fully priced — base price and every tier — in the selected currency.

## Shopping mode (B2C / B2B)

- Shoppers (or store operators, via the default) choose between a B2C experience (single delivery address, simplified checkout) and a B2B experience (multi-cart, shipping groups, quotes, Purchase Order payment).
- `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE` sets the initial mode; shoppers can change it themselves from the settings drawer, persisted in a cookie.
- **Elastic Path–hosted lock**: if `NEXT_PUBLIC_EPCC_ENDPOINT_URL` points at an Elastic Path SaaS domain, shopping mode is permanently forced to B2C — the cookie is ignored and the mode switcher is hidden from settings entirely. This does not apply to self-hosted or custom-domain endpoints, which support the full B2B experience.
- See [checkout.md](checkout.md) and [cart.md](cart.md) for what actually differs between the two modes.

## Related documents

- [catalog.md](catalog.md) — currency-aware pricing
- [checkout.md](checkout.md) — how shopping mode determines the checkout experience
- [cart.md](cart.md) — how shopping mode determines available cart features
