# Catalog & Products

What the storefront supports for browsing, presenting, and configuring products
from an Elastic Path catalog — product listing, the product detail page (PDP),
variations, bundles, bulk-buy pricing, digital products, catalog search, and
Quick View.

This doc leads with a **Capabilities** catalog (what exists), then
**Configuration** (the switches that change it), then **Behaviour scenarios**
(BDD) for the detail.

- **Routes:** `/{lang}` (homepage) · `/{lang}/category/{...slug}` · `/{lang}/products/{slug}` (PDP) · `/{lang}/search`
- **Primary source files:** `src/app/[lang]/(app)/products/[slug]/page.tsx`,
  `src/app/[lang]/(app)/category/[...slug]/page.tsx`,
  `src/components/category/CategorySearchClient.tsx`,
  `src/components/search/*` (ResultsGrid, filters, SortBy),
  `src/components/product/*` (ProductGrid, ProductCard, BundleConfigurator, variations),
  `src/hooks/use-products-inventory.ts`, `src/lib/api/products.ts`

---

## Capabilities

### Product listing & navigation
- **Homepage** shows up to 25 featured products (standard and parent/variation types), server-rendered.
- **Category pages** browse the catalog's hierarchy → node → node structure (up to 3 levels), with breadcrumbs generated from each product's hierarchy metadata.
- **Mega-menu navigation** is built from the catalog: up to 5 top-level hierarchies, each with up to 5 second-level nodes, each showing up to 8 third-level children plus a "View all" link. Assembling it costs ~30 upstream API calls, so it's cached for 5 minutes rather than rebuilt per page view.
- **Product cards** show name, price (with original/strike-through price on sale), thumbnail, optional description, and stacked badges for Bulk Buy, Variation, Bundle, and Digital where applicable.
- **List vs grid view** of the product grid is a per-shopper toggle (remembered in a cookie); a full-width shell shows a denser grid (4–5 columns vs 3).

### Product detail page (PDP)
- Name, SKU, price (with sale price), image gallery (main image + up to 4 additional images), description.
- Breadcrumbs derived from the product's own hierarchy metadata.
- Custom **extension attribute groups** (arbitrary EP product attributes) rendered as labelled field groups; specific groups can be hidden. Array-of-strings extensions render as a bullet list under the description rather than in the attribute table.
- Related-product carousels driven by the product's custom relationship slugs (e.g. "accessories"), up to 24 products per carousel.
- Optional **alternative price books** and **purchase history** (per-SKU) surfaces, each behind a flag.

### Variations (parent/child products)
- Shoppers pick variation options (e.g. size, colour) via a button-group selector; options that would resolve to no valid child are auto-disabled using the product's variation matrix.
- Once all variations are selected, the matching child product is resolved and either navigated to (PDP) or resolved in place (Quick View).
- Works from either side: a child PDP fetches its parent for the full option list; a parent PDP fetches child slugs so navigation works from the parent.

### Bundles
- Shoppers assemble a bundle from component groups, each with its own min/max selectable count (required vs optional, single- or multi-select depending on max).
- Selecting a variable-quantity option reveals a per-option quantity stepper.
- Price updates live as selections change (debounced call to EP's bundle configure endpoint), including sale pricing on individual components.
- "Add to Cart" is blocked until every required component group meets its minimum.
- Component option **images** can optionally be shown (the actual component product's image), and are fetched even for bundles where EP doesn't return them inline.

### Bulk buy / tiered pricing
- Products can define quantity-based price tiers (e.g. 1–5, 6–10, 10+ at descending prices).
- The tier table only shows when the base price **and every tier** are priced in the shopper's selected currency — otherwise the whole section is hidden rather than showing partial data.
- Bulk add-to-cart from listings adds whatever it can rather than failing the whole batch.

### Digital products
- A product is "digital" via its `commodity_type` attribute; it shows a **Digital** badge on the card and PDP.
- Adding a digital product tags the cart line with `is_digital`, which checkout later uses to skip shipping-address collection.

### Subscriptions at purchase
- Subscribable products show a One-time vs Subscribe toggle exposing the offering's plans/pricing. Variant-aware. See **[subscriptions.md](subscriptions.md)** for managing a subscription after purchase.

### Custom inputs & product fields
- Products can define custom text inputs (e.g. personalisation/engraving), optionally required, captured per cart line and carried to the order. Not available on bundles.

### Catalog search
- Full-text search across name, description and SKU (gated on search being enabled).
- Faceted filtering: always a 3-level category hierarchy + a currency-aware price range; additional attribute facets are configurable.
- Sort by relevance, price (either direction) or name (either direction).
- Search/filter state reflects in the URL, so results are bookmarkable and back-button safe.
- The **same** adapter powers category browsing when search is enabled; with search off, category pages fall back to a plain server-rendered grid (no filters/sort).
- Results use numbered pagination or **infinite scroll** (with a back-to-top button), configurable.

### Quick View
- Opens a modal from a product card without leaving the listing — image, name, description, price, variation selector or bundle configurator, and Add to Cart, no navigation. Resolved variants are cached per session.

### Inventory (multi-location)
- When enabled, stock for the visible products is fetched in one batched request and out-of-stock cards are gated (disabled add-to-cart, "Out of stock" label). Products without a per-location record are never gated.

### Currency-aware pricing
- All prices, sale prices, filters and bulk-buy tiers render in the shopper's selected currency. Changing currency refreshes the session so every price (including cached results) updates. See **[localization.md](localization.md)**.

---

## Configuration

Read in `src/lib/tenant-config.ts`; in multi-tenant mode (`MULTI_TENANT_MODE=true`)
the same fields can come from the remote config per-hostname.

| Env var | Values | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_SEARCH_ENABLED` | `true`/`false` | `false` | Master switch: interactive search/category (filters, sort, pagination) vs static server-rendered grid. Also gates the sidebar filters. |
| `NEXT_PUBLIC_LAZY_LOAD_RESULTS` | `true`/`false` | `false` | Infinite scroll + back-to-top button vs numbered pagination on search/category. |
| `NEXT_PUBLIC_FILTER_ITEMS` | `attr\|Label\|type,…` | `""` | Custom attribute facet filters (checkbox/radio) added to the sidebar. |
| `NEXT_PUBLIC_HIDE_NAV_HIERARCHY` | `true`/`false` | `false` | Flatten the hierarchy root out of the category filter tree / nav. |
| `NEXT_PUBLIC_FULL_WIDTH` | `true`/`false` | `false` | Full-viewport shell + denser product grid (4–5 cols). |
| `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION` | `true`/`false` | `false` | Batch stock fetch + out-of-stock gating on cards/PDP; adds the multi-location header to EP calls. |
| `NEXT_PUBLIC_EP_INVENTORIES_DEFAULT_LOCATION` | slug | `""` | Location used for stock when no location cookie is set. |
| `NEXT_PUBLIC_EP_INVENTORIES_EXCLUDED_LOCATIONS` | comma-list | `[]` | Locations hidden from the location selector. |
| `NEXT_PUBLIC_EXTENSIONS_EXCLUDED` | comma-list | `[]` | PDP extension groups excluded from display. |
| `NEXT_PUBLIC_SHOW_BUNDLE_OPTION_IMAGES` | `true`/`false` | `false` | Show each bundle component option's product image in the configurator. |
| `NEXT_PUBLIC_SHOW_ALTERNATIVE_PRICES` | `true`/`false` | `false` | Show alternative price rows on the PDP. |
| `NEXT_PUBLIC_ALTERNATIVE_PRICE_BOOKS` | `id\|Label,…` | `[]` | Which alternative price books to surface on the PDP. |
| `NEXT_PUBLIC_PURCHASE_HISTORY_ENABLED` | `true`/`false` | `false` | Per-SKU purchase history on the PDP. |
| `NEXT_PUBLIC_MARKETING_MODE` | `true`/`false` | `false` | Signed-out shoppers see a "sign in to search" notice instead of products. |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` | ISO codes | `USD` | Pricing currency + dropdown. |

**Per-shopper state:** `product_view_mode` cookie (list/grid), `ep_location` cookie (stock location), selected currency, selected account (re-prices on switch).

> No env controls page size (15 search / 24 static) or default sort (Relevance).

---

## Behaviour scenarios (BDD)

### Listing: search-backed vs static

```gherkin
Feature: Choose between interactive search and a static grid
  # Switch: NEXT_PUBLIC_SEARCH_ENABLED

  Scenario: Search enabled
    Given search is enabled
    Then category/search pages render filters, sorting and pagination/infinite scroll
    And an unresolved category slug still renders (name falls back to the slug label, no 404)

  Scenario: Search disabled
    Given search is disabled
    Then category pages server-render up to 24 products with no filters, sort or pager
    And an unresolved slug returns a 404
```

### Results display

```gherkin
Feature: Present product results
  # Switch: NEXT_PUBLIC_LAZY_LOAD_RESULTS

  Scenario: Numbered pagination (default)
    Given lazy load is off and there is more than one page
    Then a numbered pager is shown below the grid

  Scenario: Infinite scroll
    Given lazy load is on
    When I scroll near the bottom
    Then the next page appends automatically, with no page number in the URL
    And a back-to-top button appears after scrolling down

  Scenario: Re-price on account change
    When I switch accounts from the header
    Then results re-fetch so account-specific prices update, preserving query/filters/scroll
```

### Filtering & sorting

```gherkin
Feature: Filter and sort results

  Scenario: Category hierarchy
    Then the Categories filter lists sub-categories with counts, linking deeper into /category/...

  Scenario: Custom attribute filters
    # Switch: NEXT_PUBLIC_FILTER_ITEMS
    Given attribute filters are configured
    Then each renders as a checkbox or radio group and refines in place

  Scenario: Price range
    Then a currency-aware price-range filter refines by min/max

  Scenario Outline: Sort
    When I choose "<option>"
    Then results are ordered by "<order>"
    Examples:
      | option          | order              |
      | Relevance       | default relevance  |
      | Price: Low–High | price ascending    |
      | Price: High–Low | price descending   |
      | Name: A–Z       | name ascending     |
      | Name: Z–A       | name descending    |
```

### Product cards & inventory

```gherkin
Feature: Present each product and its stock

  Scenario Outline: Badges
    Given a product is "<type>"
    Then a "<badge>" badge is shown
    Examples:
      | type            | badge     |
      | bulk-buy offer  | bulk      |
      | has variations  | variation |
      | bundle          | bundle    |
      | digital         | digital   |

  Scenario: Out of stock
    # Switch: NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION
    Given multi-location is enabled and a product has 0 available at the resolved location
    Then its add-to-cart is disabled and labelled "Out of stock"

  Scenario: Missing price
    Given a product has no price in the selected currency
    Then its controls are disabled with an explanatory tooltip
```

### PDP: bundles, variations, bulk buy

```gherkin
Feature: Configure a product on the PDP

  Scenario: Variation selection
    Given a product has variations
    When I pick options
    Then invalid combinations are disabled and the matching child resolves

  Scenario: Bundle configuration
    Given a bundle with required and optional component groups
    Then price updates live as I select options
    And Add to Cart is blocked until every required group meets its minimum

  Scenario: Bundle option images
    # Switch: NEXT_PUBLIC_SHOW_BUNDLE_OPTION_IMAGES
    Given bundle option images are enabled
    Then each component option shows the actual component product's image

  Scenario: Bulk-buy tiers
    Given a product has quantity price tiers
    Then the tier table shows only when the base price and every tier exist in the selected currency
```

---

## Quick reference

| Want to… | Set |
|---|---|
| Turn on search/filters/sort | `NEXT_PUBLIC_SEARCH_ENABLED=true` |
| Infinite scroll instead of a pager | `NEXT_PUBLIC_LAZY_LOAD_RESULTS=true` |
| Add attribute facets | `NEXT_PUBLIC_FILTER_ITEMS=brand\|Brand\|checkbox,…` |
| Show bundle option images | `NEXT_PUBLIC_SHOW_BUNDLE_OPTION_IMAGES=true` |
| Gate out-of-stock products | `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION=true` |
| Denser, full-width grid | `NEXT_PUBLIC_FULL_WIDTH=true` |
| Hide PDP extension groups | `NEXT_PUBLIC_EXTENSIONS_EXCLUDED=DealerSpecification,…` |

**Related:** [cart.md](cart.md) · [checkout.md](checkout.md) · [subscriptions.md](subscriptions.md) · [localization.md](localization.md)
