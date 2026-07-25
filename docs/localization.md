# Localization

What the storefront supports for language, currency, and shopping-mode preferences.

- **Primary source files:** `src/context/PreferencesContext.tsx`,
  `src/context/CurrencyProvider`, `src/lib/currency.ts`, `messages/{en,fr,es}.json`,
  `src/lib/tenant-config.ts`

---

## Capabilities

### Language
- Three supported locales: **English, French, Spanish** — each URL is prefixed with the locale segment (e.g. `/en/products`, `/fr/products`).
- Shoppers switch language from the header settings drawer; switching navigates to the same page under the new locale segment.
- Translations are organised into per-feature namespaces (header, cart, checkout, account, product, …) in one JSON file per locale.
- The supported locale set is fixed in configuration, not environment-driven — adding a locale is a code change, not a deployment setting.

### Currency
- Shoppers select a currency from a header dropdown; the choice persists in a cookie and applies to every price site-wide (catalog, search, cart, checkout).
- Changing currency triggers a full page refresh (and client remount) so every cached price — including the cart and open listings — reflects the new currency consistently.
- If the cart already has items when currency changes, the shopper is prompted to start a new cart or clear the current one (prices captured in the old currency shouldn't silently carry over).
- Bulk-buy tier pricing only displays when the product is fully priced — base price and every tier — in the selected currency.

### Shopping mode (B2C / B2B)
- Shoppers (or the store default) choose a **B2C** experience (single delivery address, simplified checkout) or a **B2B** experience (multi-cart, shipping groups, quotes, Purchase Order payment).
- The shopper can change it from the settings drawer, persisted in a cookie.
- **Elastic Path–hosted lock:** if the EPCC endpoint is an Elastic Path SaaS domain, shopping mode is permanently forced to B2C — the cookie is ignored and the switcher is hidden. Self-hosted/custom-domain endpoints support the full B2B experience.

---

## Configuration

| Env var | Values | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | ISO code | `USD` | Default/fallback currency. **Must match a currency your catalog's price book has prices in**, or products show blank prices. |
| `NEXT_PUBLIC_CURRENCIES` | comma-list | `[default]` | Currencies offered in the dropdown; omit entirely for single-currency mode (no dropdown). |
| `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE` | `b2c`/`b2b` | `b2c` | Initial shopping mode (shopper-overridable unless locked). |
| `NEXT_PUBLIC_EPCC_ENDPOINT_URL` | host | `""` | An Elastic Path SaaS domain locks the mode to B2C and hides the switcher. |

**Per-shopper state:** locale segment in the URL; currency cookie; `ep_shopping_mode` cookie (ignored when locked).

---

## Behaviour scenarios (BDD)

```gherkin
Feature: Language

  Scenario: Switch locale
    When I change language in settings
    Then I stay on the same page under the new locale segment (e.g. /fr/...)
```

```gherkin
Feature: Currency

  Scenario: Switch currency
    When I change currency
    Then every price refreshes to the new currency
    And if my cart has items, I'm prompted to start a new cart or clear it
```

```gherkin
Feature: Shopping mode

  Scenario: EP-hosted lock
    Given the endpoint is an Elastic Path SaaS domain
    Then the mode is forced to B2C and the switcher is hidden
```

---

## Quick reference

| Want to… | Set |
|---|---|
| Change the default currency | `NEXT_PUBLIC_DEFAULT_CURRENCY=GBP` |
| Offer multiple currencies | `NEXT_PUBLIC_CURRENCIES=GBP,USD,CAD` |
| Default shoppers to B2B | `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE=b2b` (non-EP-hosted only) |

**Related:** [catalog-and-products.md](catalog-and-products.md) · [checkout.md](checkout.md) · [cart.md](cart.md)
