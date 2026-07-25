# Cart

What the storefront supports for adding, reviewing, and managing items before
checkout — both the slide-in **drawer** cart and the full **cart page**.

- **Full cart route:** `/{lang}/cart` · **Drawer:** header shopping-bag button on any page
- **Primary source files:** `src/app/[lang]/(app)/cart/page.tsx`,
  `src/components/cart/B2BCartContent.tsx` (full cart body — used for all shoppers),
  `src/components/header/cart/CartButton.tsx` (drawer),
  `src/components/cart/CartPageHeader.tsx` (multi-cart switcher),
  `src/context/CartContext.tsx` (state + mutations)

---

## Capabilities

### Core operations
- Add a single item, add multiple items in one batch call, or add a configured bundle.
- Remove an item, update its quantity (0 removes it), or bulk-update several quantities in one call.
- Clear the entire cart.
- Every mutation refreshes totals: subtotal, discount, shipping and grand total (formatted + numeric).

### Presentation modes
Two independent, user-togglable preferences (persisted in cookies):
- **Cart mode** — `drawer` (slide-in, default) or `full` (dedicated `/cart` page).
- **View mode** (full page) — `list` (two-column: items + sticky summary) or `grid` (single column with a bulk-edit toolbar and variation-matrix grouping).

**Drawer cart:** line items (thumbnail, name linked to the PDP for real products, SKU, quantity stepper, line total), promo entry, totals, checkout button.

**Full-page cart** renders three row types as needed:
- **Simple rows** — single products with unit price, stepper, line total, any applied discount (hover tooltip).
- **Bundle rows** — the assembled bundle plus a "what's included" breakdown of its components.
- **Matrix rows** — a parent with variation children shown as a size × colour grid, with bulk-fill tools for fast large-order editing.

Grid view **bulk-edit** stages quantity changes locally and commits them together via one "Update All", rather than round-tripping per keystroke.

### Special line-item types
- **Free gifts** (promotion-added) show a "Free Gift" badge; their stepper and delete control are disabled.
- **Zero-price items** show "FREE" and hide the redundant unit-price line.
- **Subscriptions** carry their plan name and billing frequency with a "Subscription" badge.
- **Digital items** carry an `isDigital` flag used at checkout; no special cart treatment.

### Line-item location (multi-location)
- When multi-location is on, each line is tagged with a stock **location** (slug + name); the location shows on the line and is re-sent on every update (required by EP).

### Grouping & inline-editable fields
- Lines can be **grouped** under collapsible headers by custom-input values (e.g. a PO number).
- Named custom inputs can be made **inline-editable** on the cart, saved per line.

### Promotions
- **Promo codes** — collapsible input in drawer and full-page cart; applied codes are removable chips (auto/system codes are not shown as removable).
- **Line-level discounts** — automatic-rule promotions show inline on the item with the promotion name on hover.
- **Promotion suggestions** — upsell suggestions surface as a modal on non-cart pages and an inline carousel within the cart.

### Multi-cart (B2B "requisition lists")
Available to authenticated shoppers:
- Create, name and describe multiple saved carts.
- Switch the active cart from a dropdown (name, total, item count; active one marked).
- Clear a cart's items without deleting it, or delete the cart.
- Manage the full list from **Account → Carts** as well (see [account.md](account.md)).

### B2B vs B2C
- Multi-cart management and the matrix row type are B2B-oriented; B2C works with a single cart and simple/bundle rows.
- A **"Request Quote"** action is available from the cart to authenticated shoppers as an alternative to checkout (see [quotes.md](quotes.md)).

### Totals & checkout
- Subtotal and total always shown; a discount line appears only when there's a cart-level discount.
- Shipping/tax show a "calculated at checkout" note rather than an estimate.
- Checkout CTA (drawer / summary / grid header) goes to `/{lang}/checkout`; disabled when empty.

---

## Configuration

| Env var | Values | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_DEFAULT_CART_MODE` | `drawer`/`full` | `drawer` | Header cart button opens the drawer or navigates to `/cart`. |
| `NEXT_PUBLIC_CART_VIEW_MODE` | `list`/`grid` | `list` | Default cart-page layout (grid adds matrix grouping + bulk update). |
| `NEXT_PUBLIC_CART_GROUP_BY` | selector list | `""` | Group lines by custom-input values (e.g. `product_fields[key="purchase_order"]`). |
| `NEXT_PUBLIC_CART_EDITABLE_INPUTS` | selector list | `""` | Make named custom inputs inline-editable on lines. |
| `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION` | `true`/`false` | `false` | Tag lines with a stock location; show it and re-send on updates. |
| `NEXT_PUBLIC_MARKETING_MODE` | `true`/`false` | `false` | No cart is created/loaded until sign-in. |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` | ISO codes | `USD` | Cart currency. |

> **Selector syntax** (grouping / editable inputs): a dot-path custom input
> (`po_number`) or an array lookup `arrayName[key="…"]`.

**Per-shopper state:** `ep_cart_mode`, `cart_view_mode`, `ep_location` cookies; selected account; `sessionStorage: ep_promo_suggestions`; `localStorage: _store_ep_cart` (active cart id).

---

## Behaviour scenarios (BDD)

```gherkin
Feature: Cart presentation
  # Switch: NEXT_PUBLIC_DEFAULT_CART_MODE / NEXT_PUBLIC_CART_VIEW_MODE

  Scenario: Drawer vs full
    Given the cart mode is "full"
    When I click the header cart button
    Then I go to "/{lang}/cart" (otherwise a drawer opens)

  Scenario: Grid view
    Given the cart view is "grid"
    Then variation children group under their parent and a "Bulk mode" toggle enables staged "Update All"
```

```gherkin
Feature: Multiple carts (authenticated)

  Scenario: Guest
    Given I am not signed in
    Then the cart header shows a plain title with no switcher

  Scenario: Switch / create
    Given I am signed in
    Then I can switch carts, or "Create New Cart", clear a cart, or delete it
    And quote carts are excluded from the list
```

```gherkin
Feature: Line items

  Scenario: Quantity & removal
    When I change a quantity
    Then the line updates (0 removes it); if it has a location, that location is re-sent

  Scenario: Bundles & free gifts
    Given a line is a bundle
    Then a "what's included" component breakdown is shown
    And free-gift lines have their stepper and remove disabled

  Scenario: Grouping & editable fields
    # Switch: NEXT_PUBLIC_CART_GROUP_BY / NEXT_PUBLIC_CART_EDITABLE_INPUTS
    Given grouping and/or editable inputs are configured
    Then lines group under collapsible headers, and named fields become editable and saveable
```

```gherkin
Feature: Promotions & checkout

  Scenario: Promo code
    When I apply a promo code
    Then it's upper-cased and applied (or the error detail is shown); applied codes are removable chips

  Scenario: Suggestions
    Then promotion suggestions show inline on the cart (and as a modal elsewhere)

  Scenario: Proceed
    When I click Checkout
    Then I go to "/{lang}/checkout" (disabled when empty)
    And signed-in shoppers can "Request quote" instead
```

```gherkin
Feature: States

  Scenario: Empty cart
    Given the cart has loaded empty
    Then a "Browse catalog" empty state is shown (drawer shows "Browse products")

  Scenario: Marketing mode signed out
    # Switch: NEXT_PUBLIC_MARKETING_MODE
    Then no cart exists until I sign in
```

---

## Quick reference

| Want to… | Set |
|---|---|
| Header button → full cart page | `NEXT_PUBLIC_DEFAULT_CART_MODE=full` |
| Default cart to grid + bulk update | `NEXT_PUBLIC_CART_VIEW_MODE=grid` |
| Group lines by a PO/custom field | `NEXT_PUBLIC_CART_GROUP_BY=product_fields[key="purchase_order"]` |
| Edit custom fields on the cart | `NEXT_PUBLIC_CART_EDITABLE_INPUTS=po_number,…` |
| Tag lines with a location | `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION=true` |

**Related:** [catalog-and-products.md](catalog-and-products.md) · [checkout.md](checkout.md) · [quotes.md](quotes.md) · [account.md](account.md)
