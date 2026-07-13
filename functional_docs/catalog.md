# Catalog & Product Functional Document

What the storefront supports for browsing, presenting, and configuring products from an Elastic Path catalog.

## Product listing & navigation

- **Homepage** shows up to 25 featured products (standard and parent/variation product types), server-rendered.
- **Category pages** browse the catalog's hierarchy → node → node structure (up to 3 levels), with breadcrumbs generated from each product's hierarchy metadata.
- **Mega-menu navigation** is built directly from the catalog: up to 5 top-level hierarchies, each with up to 5 second-level nodes, each showing up to 8 third-level children plus a "View all" link. Assembling this costs roughly 30 upstream API calls, so it's cached for 5 minutes (`unstable_cache`) rather than rebuilt on every page view.
- **Product cards** show name, price (with original/strikethrough price when on sale), thumbnail, optional description, and stacked badges for Bulk Buy, Variation, Bundle, and Digital where applicable.

## Product detail page (PDP)

- Name, SKU, price (with sale price), image gallery (main image + up to 4 additional images), description.
- Breadcrumbs derived from the product's own hierarchy metadata.
- Custom extension attribute groups (arbitrary EP product attributes), rendered as labeled field groups; specific groups can be hidden via `NEXT_PUBLIC_EXTENSIONS_EXCLUDED`.
- Related-product carousels driven by the product's custom relationship slugs (e.g. "accessories"), up to 24 products per carousel.
- A **Digital** badge (with download icon) when the product's `commodity_type` attribute is `digital`.

## Variations (parent/child products)

- Shoppers pick variation options (e.g. size, color) via a button-group selector; options that would resolve to no valid child product are automatically disabled, using the product's variation matrix.
- Once all variations are selected, the storefront resolves the matching child product and can either navigate to its PDP or resolve it in place (used by Quick View).
- Works from either side: a child PDP fetches its parent to get the full variation list; a parent PDP fetches child slugs so navigation works from the parent.

## Bundles

- Shoppers assemble a bundle from component groups, each with its own min/max selectable count (required vs. optional groups, single-select or multi-select depending on max).
- Selecting a variable-quantity option reveals a per-option quantity stepper.
- Price updates live as selections change (debounced call to EP's bundle configure endpoint), including sale pricing on individual components.
- "Add to Cart" is blocked until every required component group meets its minimum.

## Bulk buy / tiered pricing

- Products can define quantity-based price tiers (e.g. 1–5 units at one price, 6–10 at a lower price, 10+ at a lower price still).
- The tier table is only shown when the product's base price **and every tier** are priced in the shopper's currently selected currency — if the currency doesn't have full tier pricing, the whole section is hidden rather than showing blank/partial data.

## Digital products

- A product is "digital" via its `commodity_type` attribute.
- Digital products show a **Digital** badge on both the card and the PDP.
- Adding a digital product (or a digital variant) to cart tags the cart line item with `custom_inputs.is_digital = "true"`, which checkout later uses to skip shipping-address collection (see [checkout.md](checkout.md)).

## Subscriptions (purchase-time selection)

- A product becomes subscribable when Elastic Path has a subscription offering linked to it.
- The PDP shows a One-time vs. Subscribe toggle; subscribing exposes the offering's plans and pricing options (name, frequency, price).
- Works with variations too — the offering lookup is variant-aware, resolving against the selected child product with the parent as fallback.
- See [subscriptions.md](subscriptions.md) for post-purchase subscription management.

## Custom inputs & product fields

- Products can define custom text inputs (e.g. personalization, engraving text), each optionally required.
- Values are captured per cart line item and carried through to order line items for fulfillment reference. Not available on bundles (bundles use only their own component configurator).

## Catalog search

Gated behind `NEXT_PUBLIC_SEARCH_ENABLED=true` (off by default) and Elastic Path's Algolia-backed catalog search adapter.

- Full-text search across name, description, and SKU.
- Faceted filtering: always includes 3-level category hierarchy and a currency-aware price range; additional facets are configurable via `NEXT_PUBLIC_FILTER_ITEMS` (attribute, label, and checkbox/radio type per facet).
- Sorting by relevance, price (either direction), or name (either direction).
- Search/filter state reflects in the URL, so results are bookmarkable and back-button-safe.
- The same search adapter powers category-page browsing (filtering within one category) when search is enabled; with search disabled, category pages fall back to a plain server-rendered product grid with no filters/sorting.

## Quick View

- Opens a modal from a product card without leaving the listing page.
- Shows the same PDP building blocks scoped to the modal: image, name, description, price, variation selector or bundle configurator, and Add to Cart — all without a page navigation.
- Resolving a variant inside the modal swaps in the resolved child's image/price/description and is cached per session to avoid refetching.

## Multi-location inventory

- `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION=true` adds an `EP-Inventories-Multi-Location` header to every Elastic Path API call (server and client). This is a backend behavior switch — the storefront itself has no location picker or per-location stock UI.

## Currency-aware pricing

- All product prices, sale prices, price filters, and bulk-buy tiers are fetched/rendered using the shopper's currently selected currency (see [localization.md](localization.md)).
- Changing currency triggers a full session refresh so every price on screen — including cached search results — reflects the new currency.

## Related documents

- [cart.md](cart.md) — what happens once a product is added to cart
- [checkout.md](checkout.md) — digital-order and subscription handling at checkout
- [subscriptions.md](subscriptions.md) — managing a subscription after purchase
- [localization.md](localization.md) — currency configuration
