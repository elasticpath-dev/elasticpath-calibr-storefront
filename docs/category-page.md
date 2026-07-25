# Category Page — Functional Specification (BDD)

This document describes **everything the category page does**, written as BDD
(Behaviour-Driven Development) scenarios so a non-author can understand the
built-in behaviour and the switches (environment variables / tenant config)
that change it.

- **Routes:** `/{lang}/category/{...slug}` (e.g. `/en/category/paint-and-sundries/interior`)
- **Bare route:** `/{lang}/category` → redirects to `/{lang}/search`
- **Primary source files:**
  - `src/app/[lang]/(app)/category/[...slug]/page.tsx` (route + server data)
  - `src/components/category/CategorySearchClient.tsx` (search-backed UI)
  - `src/components/search/ResultsGrid.tsx` (results: pagination / infinite scroll)
  - `src/components/search/filters/*` (sidebar filters, sort)
  - `src/components/product/ProductGrid.tsx` + `ProductCard.tsx` (cards, bulk add)
  - `src/hooks/use-products-inventory.ts` + `src/lib/api/inventory.ts` (stock)

> **Terminology:** a category slug resolves to either a **hierarchy** (top-level
> catalog tree, single slug segment) or a **node** (a branch/leaf inside a
> hierarchy). Only the **last** slug segment is resolved against the catalog;
> earlier segments are cosmetic (breadcrumbs only).

---

## Environment variables that change this page

Every variable below is read in `src/lib/tenant-config.ts`
(`buildTenantConfigFromEnv`). In multi-tenant mode (`MULTI_TENANT_MODE=true`)
the same fields can be overridden per-hostname by the remote config endpoint.

### Directly change category-page behaviour

| Env var | Config field | Values | Default | Effect on the category page |
|---|---|---|---|---|
| `NEXT_PUBLIC_SEARCH_ENABLED` | `features.searchEnabled` | `true`/`false` | `false` | **Master switch.** `true` → interactive InstantSearch page (filters, sort, pagination). `false` → static server-rendered grid (max 24 products, no filters/sort, 404 on unknown slug). Also gates whether the sidebar filters work at all. |
| `NEXT_PUBLIC_LAZY_LOAD_RESULTS` | `ui.lazyLoadResults` | `true`/`false` | `false` | `true` → infinite scroll (auto-load next page on scroll) + a bottom-right "back to top" button. `false` → numbered pagination. |
| `NEXT_PUBLIC_FILTER_ITEMS` | `features.filterItems` | `attr|Label|type,…` (`type` = `checkbox`\|`radio`) | `""` | Adds custom attribute facet filters to the sidebar and registers them as `facet_by` attributes. |
| `NEXT_PUBLIC_HIDE_NAV_HIERARCHY` | `features.hideNavHierarchy` | `true`/`false` | `false` | `true` → drops the hierarchy root row from the category filter tree and promotes its children to the top level. |
| `NEXT_PUBLIC_FULL_WIDTH` | `ui.fullWidth` | `true`/`false` | `false` | `true` → full-viewport shell and a denser product grid (4–5 columns instead of 3). |
| `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION` | `inventory.multiLocation` | `true`/`false` | `false` | `true` → batch-fetch per-location stock for the visible products and gate out-of-stock cards. `false` → no stock gating. |
| `NEXT_PUBLIC_EP_INVENTORIES_DEFAULT_LOCATION` | `inventory.defaultLocation` | location slug | `""` (→ aggregate) | Location used for stock display when no location cookie is set. |
| `NEXT_PUBLIC_EP_INVENTORIES_EXCLUDED_LOCATIONS` | `inventory.excludedLocations` | comma-list of slugs | `[]` | Locations hidden from the location selector. |
| `NEXT_PUBLIC_MARKETING_MODE` | `features.marketingMode` | `true`/`false` | `false` | `true` + signed-out → EP APIs are held, so the category page shows a "sign in to search" notice instead of products. |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | `currency.default` | ISO code (uppercased) | `USD` | Currency used to price product cards and the price-range filter. |
| `NEXT_PUBLIC_CURRENCIES` | `currency.available` | comma-list | `[default]` | Currency dropdown; switching re-prices the grid. |
| `NEXT_PUBLIC_EXTENSIONS_EXCLUDED` | `features.extensionsExcluded` | comma-list (lowercased) | `[]` | Extension groups excluded from the shared product fetch. |
| `NEXT_PUBLIC_DEFAULT_CART_MODE` | `ui.defaultCartMode` | `drawer`/`full` | `drawer` | Where an add-to-cart from a card lands (drawer vs `/cart`). |
| `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE` | `ui.defaultShoppingMode` | `b2c`/`b2b` | `b2c` | B2B vs B2C affects card/cart presentation. Forced to `b2c` when the EPCC endpoint is Elastic Path–hosted. |

### Indirect / global (affect the page but are not category-specific)

`NEXT_PUBLIC_EPCC_ENDPOINT_URL`, `NEXT_PUBLIC_EPCC_CLIENT_ID` (catalog access);
`REQUIRE_LOGIN`, `GATEKEEPER_PASSWORD` (access gating before any page);
`NEXT_PUBLIC_BRAND_*` / `NEXT_PUBLIC_COLOR_*` (card colours via CSS vars);
`NEXT_PUBLIC_CART_GROUP_BY`, `NEXT_PUBLIC_CART_EDITABLE_INPUTS`,
`NEXT_PUBLIC_CART_VIEW_MODE` (cart reached from add-to-cart).

> There are **no** env vars for page size or default sort. Page size is fixed at
> **15** per page (`per_page: 15` in `CategorySearchClient`), the static grid at
> **24**. Default sort is **Relevance**.

### Per-shopper state (not env — cookies / session)

- `product_view_mode` cookie — grid list vs row view (default `list`).
- `ep_location` cookie — selected inventory location.
- selected currency (cookie) — re-prices the grid.
- selected account (session) — triggers a re-fetch (prices are account-specific).

---

## Feature: Category routing & data source

```gherkin
Feature: Resolve a category URL to catalog content

  Scenario: Visiting the bare category path
    Given I open "/en/category"
    Then I am redirected to "/en/search"

  Scenario: A single-segment slug is treated as a hierarchy
    Given I open "/en/category/paint-and-sundries"
    When the server resolves the last slug segment
    Then it is looked up as a hierarchy root ("getHierarchyBySlug")

  Scenario: A multi-segment slug is treated as a node
    Given I open "/en/category/paint-and-sundries/interior"
    When the server resolves the last slug segment "interior"
    Then it is looked up as a node ("getNodeBySlug")
    And the earlier segments only build the breadcrumb trail

  Scenario: Breadcrumbs are built from every slug segment
    Given I open "/en/category/paint-and-sundries/interior"
    Then I see "Home › Paint And Sundries › Interior"
    And each segment is title-cased with hyphens turned into spaces
```

## Feature: Rendering mode (search-enabled vs static)

```gherkin
Feature: Choose between interactive search and a static grid
  # Switch: NEXT_PUBLIC_SEARCH_ENABLED

  Scenario: Search is enabled
    Given NEXT_PUBLIC_SEARCH_ENABLED is "true"
    When I open a category page
    Then the page renders the interactive CategorySearchClient
    And I get filters, sorting and pagination/infinite scroll
    And an unresolved slug still renders (name falls back to the slug label, no 404)

  Scenario: Search is disabled
    Given NEXT_PUBLIC_SEARCH_ENABLED is "false"
    When I open a category page
    Then the server fetches up to 24 products for the hierarchy or node
    And renders a plain product grid with no filters, sort or pager
    And an unresolved slug returns a 404 (notFound)
```

## Feature: Scoping results to the category

```gherkin
Feature: Show only products in the selected category

  Scenario: Results are filtered to the category node(s)
    Given search is enabled
    When the results load
    Then the search is constrained by "meta.search.nodes.slug" for every slug segment
    And the page size is 15 products per page
    And products are matched on name, description and SKU
```

## Feature: Results display — pagination vs infinite scroll

```gherkin
Feature: Present the product results
  # Switch: NEXT_PUBLIC_LAZY_LOAD_RESULTS

  Scenario: Numbered pagination (default)
    Given NEXT_PUBLIC_LAZY_LOAD_RESULTS is "false"
    When there is more than one page of results
    Then a numbered pager is shown below the grid
    And choosing a page replaces the grid with that page

  Scenario: Infinite scroll
    Given NEXT_PUBLIC_LAZY_LOAD_RESULTS is "true"
    When I scroll near the bottom of the grid
    Then the next page is loaded and appended automatically
    And a loading spinner shows while more pages remain
    And no page number is added to the URL

  Scenario: Back-to-top button in infinite scroll
    Given infinite scroll is enabled
    When I have scrolled more than 600px down
    Then a "back to top" button appears in the bottom-right corner
    And clicking it smooth-scrolls to the top of the page

  Scenario: Re-price the grid when the account changes
    Given I am browsing results
    When I switch to a different account from the header
    Then the results are re-fetched so account-specific prices update
    And my current category, filters and scroll are preserved
```

## Feature: States (loading, empty, error, marketing mode)

```gherkin
Feature: Communicate the state of the results

  Scenario: Initial load
    Given the first page of results has not arrived
    Then 6 skeleton placeholder cards are shown

  Scenario: Refetching (e.g. account/currency change)
    Given results are being re-fetched
    Then skeleton cards are shown instead of a false "no products" message

  Scenario: No matching products
    Given the query returns zero products and there is no error
    Then a "no results" message is shown

  Scenario: Search error
    Given the search request fails
    Then a red error banner with the error message is shown

  Scenario: Marketing mode while signed out
    # Switch: NEXT_PUBLIC_MARKETING_MODE
    Given NEXT_PUBLIC_MARKETING_MODE is "true"
    And I am not signed in
    Then EP APIs are held and a "sign in to search" notice replaces the results
```

## Feature: Filtering

```gherkin
Feature: Filter the category results

  Scenario: Desktop filter sidebar
    Given search is enabled
    Then a left sidebar shows Categories, Price range and any custom filters
    And a "Clear all" control appears when at least one filter is active

  Scenario: Mobile filter drawer
    Given I am on a small screen
    When I tap "Filters"
    Then a slide-in drawer shows the same filters
    And a "View results" button closes the drawer

  Scenario: Navigate the category hierarchy
    Given I am on a category page
    Then the Categories filter lists sub-categories with product counts
    And each row links deeper into "/{lang}/category/..."
    And the current category is highlighted in the brand colour

  Scenario: Hide the hierarchy root
    # Switch: NEXT_PUBLIC_HIDE_NAV_HIERARCHY
    Given NEXT_PUBLIC_HIDE_NAV_HIERARCHY is "true"
    Then the hierarchy root row is dropped and its children shown at the top level

  Scenario: Custom attribute filters
    # Switch: NEXT_PUBLIC_FILTER_ITEMS = "brand|Brand|checkbox,color|Colour|radio"
    Given NEXT_PUBLIC_FILTER_ITEMS defines attribute filters
    Then each attribute renders as a checkbox group (default) or radio group
    And refining updates the results in place

  Scenario: Price range filter
    Given the results have prices in the selected currency
    Then a collapsible price-range filter shows the available min/max
    And entering a min/max and blurring (or Enter) refines by price

  Scenario: Category counts come from the current results
    Then the category tree counts are read from the main query's facets
    And no extra facet requests are made
```

## Feature: Sorting

```gherkin
Feature: Sort the category results

  Scenario Outline: Choose a sort option
    Given search is enabled
    When I pick "<option>" from the Sort dropdown
    Then the results are ordered by "<order>"

    Examples:
      | option        | order                  |
      | Relevance     | default relevance      |
      | Price: Low–High | price ascending      |
      | Price: High–Low | price descending     |
      | Name: A–Z     | name ascending         |
      | Name: Z–A     | name descending        |
```

## Feature: Product cards

```gherkin
Feature: Present each product on the grid

  Scenario: Card contents
    Then each card shows the image, name (links to the PDP), SKU, price and a short description

  Scenario: Sale price
    Given a product has an original price higher than its current price
    Then the original price is shown with a strike-through

  Scenario Outline: Product-type badges
    Given a product is a "<type>"
    Then a "<badge>" badge is shown

    Examples:
      | type            | badge     |
      | bulk-buy offer  | bulk      |
      | has variations  | variation |
      | bundle          | bundle    |
      | digital (static grid only) | digital |

  Scenario: Missing price
    Given a product has no price for the selected currency
    Then the add-to-cart controls are disabled with an explanatory tooltip

  Scenario: Variations or bundles use Quick View
    Given a product has variations or is a bundle
    Then the card shows a "Quick View" button instead of add-to-cart
    # (In row view, variation products expand an inline variant matrix instead.)

  Scenario: List vs row view
    # Per-shopper cookie: product_view_mode
    Given I toggle between grid and list view
    Then my choice is remembered in the "product_view_mode" cookie

  Scenario: Grid density
    # Switch: NEXT_PUBLIC_FULL_WIDTH
    Given NEXT_PUBLIC_FULL_WIDTH is "true"
    Then the grid shows 4–5 columns instead of 3
```

## Feature: Inventory & out-of-stock gating

```gherkin
Feature: Reflect stock on the grid
  # Switch: NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION

  Scenario: Multi-location disabled
    Given NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION is "false"
    Then no stock is fetched and no card is gated

  Scenario: Multi-location enabled
    Given multi-location is enabled
    When the grid loads
    Then stock for all visible products is fetched in a single batched request
    And the location is taken from the "ep_location" cookie,
        else the default location, else the aggregate stock

  Scenario: Out-of-stock product
    Given a product has per-location inventory and 0 available at the resolved location
    Then its quantity selector and add-to-cart are disabled
    And the button reads "Out of stock"

  Scenario: Product without a location record
    Given a product has no multi-location inventory record
    Then it is never gated as out of stock
```

## Feature: Add to cart (single and bulk)

```gherkin
Feature: Add products to the cart from the grid

  Scenario: Add a single product
    Given a simple, in-stock product
    When I set a quantity and click add-to-cart
    Then the product is added and I get a confirmation
    And the cart opens as a drawer or navigates to /cart per NEXT_PUBLIC_DEFAULT_CART_MODE

  Scenario: Bulk mode
    When I enable "Bulk mode"
    Then each card shows a quantity stepper only
    And staged quantities accumulate without adding immediately

  Scenario: Add all staged items
    Given I have staged quantities in bulk mode
    When I click "Add all to cart"
    Then all staged items are added in one request
    And the request uses add_all_or_nothing = false, so available items are added
        even if some fail
    And the staged quantities are cleared and a count is shown

  Scenario: Location travels with the cart item
    Given multi-location is enabled and a location is selected
    Then the location slug and name are attached to each added item
```

---

## Quick reference — one line per switch

| Want to… | Set |
|---|---|
| Turn on filters/sort/pagination | `NEXT_PUBLIC_SEARCH_ENABLED=true` |
| Use infinite scroll instead of a pager | `NEXT_PUBLIC_LAZY_LOAD_RESULTS=true` |
| Add attribute facet filters | `NEXT_PUBLIC_FILTER_ITEMS=brand\|Brand\|checkbox,…` |
| Flatten the hierarchy root in the filter tree | `NEXT_PUBLIC_HIDE_NAV_HIERARCHY=true` |
| Denser, full-width grid | `NEXT_PUBLIC_FULL_WIDTH=true` |
| Show stock / gate out-of-stock cards | `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION=true` (+ default/excluded locations) |
| Require sign-in before showing products | `NEXT_PUBLIC_MARKETING_MODE=true` |
| Change pricing currency | `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` |
| Send adds to `/cart` instead of the drawer | `NEXT_PUBLIC_DEFAULT_CART_MODE=full` |
