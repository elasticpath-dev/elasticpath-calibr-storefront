# Calibr — Elastic Path Storefront

A Next.js (App Router) storefront built on Elastic Path Composable Commerce, supporting both B2C and B2B shopping experiences from a single codebase.

## Prerequisites

- Node.js 20+ and npm
- An Elastic Path Commerce Cloud store (Commerce Manager access)
- A published catalog in that store

## Quick start (minimal setup)

This gets the storefront running against your Elastic Path store: browsing the catalog with correctly priced products, cart, and shopper login/sign-up. Everything else — branding, extra currencies, payments, analytics — has a working default and can be layered on afterwards.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the minimal env template:

   ```bash
   cp .env.example.minimal .env.local
   ```

3. Fill in the four required values in `.env.local`:

   | Variable | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_EPCC_ENDPOINT_URL` | Commerce Manager → Settings → Application Keys. No `https://` prefix, no trailing slash (e.g. `euwest.api.elasticpath.com`). |
   | `NEXT_PUBLIC_EPCC_CLIENT_ID` | Commerce Manager → Settings → Application Keys. |
   | `NEXT_PUBLIC_PASSWORD_PROFILE_ID` | Commerce Manager → Settings → Authentication → Password Profiles. Powers shopper login, sign-up, and password reset. |
   | `NEXT_PUBLIC_DEFAULT_CURRENCY` | Must match a currency your catalog's price book actually has prices in (e.g. `USD`, `GBP`) — otherwise products show blank/missing prices. |

4. Run the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). You should see your catalog with prices. Add an item to the cart and try signing up an account to confirm the four variables are correct.

If the homepage loads with no products or blank prices, double check the endpoint URL has no protocol/trailing slash, that the client ID belongs to the same store as the endpoint, and that the default currency matches a currency in your price book.

## Going further: the full env reference

Once the minimal setup works, copy `.env.example.full` for the complete list of optional variables, or just add the ones you need to your existing `.env.local` — every variable below is optional and defaults to sensible behavior if omitted.

```bash
cp .env.example.full .env.local   # only if starting over; otherwise merge by hand
```

### Elastic Path CMS

Controls whether the homepage, footer, and logo are managed visually in the Elastic Path CMS studio or fall back to the storefront's hard-coded sections.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_EP_CMS_PROJECT_ID` | CMS project ID. Leave blank to disable CMS entirely. |
| `NEXT_PUBLIC_EP_CMS_API_TOKEN` | CMS API token. |
| `NEXT_PUBLIC_EP_CMS_PREVIEW` | `true` fetches unpublished draft content on every request — useful while authoring, but slow. Leave `false`/unset in production so the storefront serves the published version from cache. |

### Access control

| Variable | Purpose |
|---|---|
| `GATEKEEPER_PASSWORD` | Set to require a password before any page loads — handy for gating a staging/preview deployment. Leave empty to disable. |

### Store branding

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_STORE_NAME` | Wordmark shown in the header and checkout. Defaults to `Calibr`. |
| `NEXT_PUBLIC_STORE_TITLE` | Browser-tab / SEO title. Defaults to `"<name> by Elasticpath"`. |
| `NEXT_PUBLIC_STORE_DESCRIPTION` | Meta description tag. |
| `NEXT_PUBLIC_BRAND_PRIMARY`, `NEXT_PUBLIC_BRAND_SECONDARY`, `NEXT_PUBLIC_BRAND_ACCENT`, `NEXT_PUBLIC_BRAND_MUTED` | Brand color scale (hex, no `#`). Drives buttons, links, and selection states throughout the site. |
| `NEXT_PUBLIC_COLOR_INK_*` (`900`–`50`) | Neutral/gray scale used for text and surfaces. |
| `NEXT_PUBLIC_COLOR_SUCCESS_*`, `NEXT_PUBLIC_COLOR_ERROR_*`, `NEXT_PUBLIC_COLOR_WARNING_600` | Semantic colors for status badges, alerts, and confirmation states. |

All color variables ship with defaults, so you only need to set the ones you're overriding.

### Shopping preferences

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_DEFAULT_CART_MODE` | `drawer` (slide-in panel, default) or `full` (dedicated `/cart` page). Shoppers can change this themselves from the header settings drawer. |
| `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE` | `b2c` or `b2b` — the initial shopping experience. Shoppers can switch it from the settings drawer unless overridden below. |
| `NEXT_PUBLIC_CART_VIEW_MODE` | Default view for the B2B cart page: `list` or `grid`. |

> **Elastic Path–hosted stores are B2C-only.** If `NEXT_PUBLIC_EPCC_ENDPOINT_URL` contains `elasticpath.com`, shopping mode is always forced to `b2c` and the B2B/B2C switcher is hidden from settings — regardless of `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE` or any previously saved preference. This only applies to Elastic Path SaaS-hosted endpoints; self-hosted or custom-domain endpoints are unaffected.

### Currency

`NEXT_PUBLIC_DEFAULT_CURRENCY` is required — see the minimal setup above. The variable below is optional, layered on top of it:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CURRENCIES` | Comma-separated list shown in the header currency dropdown, e.g. `GBP,USD,CAD`. Omit for a single-currency store (no dropdown shown). Include `NEXT_PUBLIC_DEFAULT_CURRENCY`'s value in this list so it's selectable alongside the others. |

### Catalog search

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SEARCH_ENABLED` | `true` shows the search icon and enables the search page. |
| `NEXT_PUBLIC_FILTER_ITEMS` | Sidebar filters for search/category pages. Format: `attribute\|Display Name\|type`, comma-separated, where `type` is `checkbox` or `radio`. Requires `NEXT_PUBLIC_SEARCH_ENABLED=true`. |
| `NEXT_PUBLIC_EXTENSIONS_EXCLUDED` | Comma-separated extension group names to hide on the product detail page. |

### Payments

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_STRIPE_ACCOUNT_ID` | Set this if you're using **EP Payments powered by Stripe** — it also switches the storefront to Elastic Path's managed Stripe gateway. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key. Required either way; if `NEXT_PUBLIC_STRIPE_ACCOUNT_ID` is left blank, the storefront uses your own Stripe account directly instead of EP Payments. |

Without `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, the "Card" payment option isn't shown at checkout at all. "Purchase Order" and "Cash on Delivery" are manual payment methods with no gateway involved: the order is placed directly via Elastic Path's `manual` payment gateway and reconciled by the merchant afterwards. Purchase Order captures a PO reference number from the shopper; Cash on Delivery captures nothing extra.

"Purchase Order" is a B2B concept, so it's hidden for B2C shoppers on an Elastic Path–hosted store (see the shopping-mode lock above) — it remains available in B2B mode, and on any self-hosted/custom-domain store regardless of shopping mode. "Cash on Delivery" always shows.

If you see "Manual payments aren't enabled for this store" at checkout, go to Commerce Manager → Settings → Payment, select **Manual**, and enable it.

### Product analytics

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key. Leave empty to disable analytics entirely — no script is loaded. |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` (default) or `https://us.i.posthog.com`, matching your PostHog project's region. |

Events are proxied through the storefront's own domain (`/ingest`) so they aren't blocked by ad blockers.

## Functional documentation

Each functional area has its own doc under [`functional_docs/`](functional_docs/), describing what the storefront supports from a functional/business perspective, not just how it's implemented:

| Area | Covers |
|---|---|
| [catalog.md](functional_docs/catalog.md) | Browsing, product detail pages, variations, bundles, bulk-buy pricing, digital products, search, Quick View |
| [cart.md](functional_docs/cart.md) | Cart operations, drawer/full-page/list/grid presentation, promotions, multi-cart (B2B) |
| [checkout.md](functional_docs/checkout.md) | B2C and B2B checkout flows, digital-only orders, billing, and all payment methods |
| [quotes.md](functional_docs/quotes.md) | B2B quote requests and quote history |
| [account.md](functional_docs/account.md) | Authentication, multi-account membership, address book, account navigation |
| [orders.md](functional_docs/orders.md) | Order history, order detail, reorder |
| [subscriptions.md](functional_docs/subscriptions.md) | Subscribing to a product and managing subscriptions afterward |
| [localization.md](functional_docs/localization.md) | Language, currency, and B2C/B2B shopping-mode behavior |
| [branding-and-cms.md](functional_docs/branding-and-cms.md) | Store branding/theming and the Elastic Path CMS integration |
| [analytics-and-access.md](functional_docs/analytics-and-access.md) | Product analytics, web performance analytics, and the site-wide access gate |

## Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server at `localhost:3000`. |
| `npm run build` | Production build. |
| `npm start` | Run a production build (run `build` first). |
| `npm run storybook` | Component explorer at `localhost:6006`. |
| `npm run build-storybook` | Static Storybook build. |
