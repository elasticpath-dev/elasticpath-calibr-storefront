# Cart Functional Document

What the storefront supports for adding, reviewing, and managing items before checkout.

## Core operations

- Add a single item, add multiple items in one batch call, or add a configured bundle.
- Remove an item, update its quantity (setting quantity to 0 removes it), or bulk-update several items' quantities in a single atomic call.
- Clear the entire cart.
- Every mutation refreshes cart totals: subtotal, discount, shipping, and grand total (formatted and numeric).

## Presentation modes

Two independent preferences, both user-togglable from the header settings drawer and persisted in cookies:

- **Cart mode** — `drawer` (slide-in panel, default) or `full` (dedicated `/cart` page). Controlled by `NEXT_PUBLIC_DEFAULT_CART_MODE`.
- **View mode** (full-page cart only) — `list` (two-column: items + sticky summary) or `grid` (single column, adds a bulk-edit toolbar). Controlled by `NEXT_PUBLIC_CART_VIEW_MODE`.

### Drawer cart

Slide-in panel from the header: line items with thumbnail, name (linked to the PDP when the item is a real catalog product), SKU, quantity stepper, line total, promo code entry, order totals, and a checkout button.

### Full-page cart

Renders three distinct row types depending on what's in the cart:

- **Simple rows** — single products: name, SKU, unit price, quantity stepper, line total, any applied discount (with a hover tooltip explaining the promotion).
- **Bundle rows** — the assembled bundle plus a breakdown table of its components (name, quantity, unit price, line total).
- **Matrix rows** — a parent product with multiple variation children shown as a grid (e.g. size × color); includes bulk-fill tools (fill all empty cells, set all, increase/decrease by amount or percentage) for fast large-order editing.

**Grid view bulk-edit mode**: quantity edits across many rows are staged locally and committed together via a single "Update All" action, rather than round-tripping the API on every keystroke.

## Special line-item types

- **Free gifts** — items a promotion added automatically (`auto_add_quantity`) show a green "Free Gift" badge, have their quantity stepper disabled, and hide their delete control (the control's space is preserved so the row still aligns with normal rows).
- **Zero-price items** — any line item priced at 0 shows "FREE" instead of a price, and hides the redundant "$0.00 each" unit-price line.
- **Subscriptions** — subscription line items carry their plan name and billing frequency and show a blue "Subscription" badge.
- **Digital items** — carry an `isDigital` flag used later at checkout; no special cart-page treatment beyond that.

## Promotions

- **Promo codes** — collapsible input in both drawer and full-page cart; applied codes are listed with a remove control. Auto-generated/system codes are not shown as user-removable.
- **Line-level discounts** — automatic rule promotions display inline on the affected item with the promotion name/description available on hover.
- **Promotion suggestions** — after cart changes, the storefront can surface upsell suggestions: a modal on non-cart pages, and an inline carousel within the cart itself.

## Multi-cart (B2B "requisition lists")

Available to authenticated shoppers:

- Create, name, and describe multiple saved carts.
- Switch the active cart from a dropdown (in the full-page cart header) showing each cart's name, total, and item count, with the active one marked.
- Clear a cart's items without deleting the cart, or delete the cart entirely.
- Manage the full list from the account "Carts" page as well (see [account.md](account.md)) — same operations, list view.

## B2B vs. B2C differences

- Multi-cart management and the matrix (variation grid) row type are B2B-oriented; B2C shoppers work with a single cart and simple/bundle rows only.
- A "Request Quote" action is available from the cart to authenticated B2B shoppers as an alternative to checkout (see [quotes.md](quotes.md)).

## Related documents

- [catalog.md](catalog.md) — how product data (bundles, variations, digital flag) reaches the cart
- [checkout.md](checkout.md) — what happens to cart contents at checkout
- [quotes.md](quotes.md) — converting a cart into a quote request
- [account.md](account.md) — managing saved carts from the account area
