# Cart — Functional Specification (BDD)

This document describes **everything the cart does** — both the slide-in **drawer
cart** and the full **cart page** — written as BDD scenarios so a non-author can
understand the behaviour and the switches that change it.

- **Full cart route:** `/{lang}/cart`
- **Drawer cart:** opened from the header shopping-bag button on any page
- **Primary source files:**
  - `src/app/[lang]/(app)/cart/page.tsx` (cart page route)
  - `src/components/cart/B2BCartContent.tsx` (full cart body — used for **all** shoppers)
  - `src/components/header/cart/CartButton.tsx` (header button + drawer)
  - `src/components/cart/CartPageHeader.tsx` (multi-cart switcher, totals in grid view)
  - `src/context/CartContext.tsx` (single source of truth for items, totals, mutations)
  - `src/components/cart/*` (row components, summary panel, promo, offers)
  - `src/app/[lang]/(app)/account/carts/page.tsx` + `CartsTab.tsx` (saved-carts management)

> **Note:** `B2BCartContent` is the cart body for **every** shopper (B2B and B2C).
> There is no separate B2C cart. What changes the cart page is whether the shopper
> is **signed in** (multi-cart switcher) — not the B2B/B2C shopping mode.

---

## Environment variables that change the cart

Read in `src/lib/tenant-config.ts` (`buildTenantConfigFromEnv`); in multi-tenant
mode (`MULTI_TENANT_MODE=true`) the same fields can come from the remote config
per-hostname.

### Directly change cart behaviour

| Env var | Config field | Values | Default | Effect |
|---|---|---|---|---|
| `NEXT_PUBLIC_DEFAULT_CART_MODE` | `ui.defaultCartMode` | `drawer`/`full` | `drawer` | `drawer` → header button opens the slide-in drawer. `full` → header button navigates to `/cart`. |
| `NEXT_PUBLIC_CART_VIEW_MODE` | `ui.cartViewMode` | `list`/`grid` | `list` | Default layout of the cart page. `list` = two-column with summary panel; `grid` = full-width with variation-matrix grouping + bulk update. |
| `NEXT_PUBLIC_CART_GROUP_BY` | `ui.cartGroupBy` | selector list | `""` (none) | Groups line items under collapsible headers by custom-input values (e.g. `po_number`, `product_fields[key="purchase_order"]`). |
| `NEXT_PUBLIC_CART_EDITABLE_INPUTS` | `ui.cartEditableInputs` | selector list | `""` (none) | Renders inline-editable text inputs on line items for the named custom inputs. |
| `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION` | `inventory.multiLocation` | `true`/`false` | `false` | Enables per-line location tagging; shows the location name on each line and re-sends it on every update. |
| `NEXT_PUBLIC_MARKETING_MODE` | `features.marketingMode` | `true`/`false` | `false` | When signed out, no cart is created/loaded until sign-in. |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` | `currency.*` | ISO codes | `USD` | Currency the cart totals and line prices are shown in. |

> **Selector syntax** (grouping & editable inputs): a dot-path custom input
> (`po_number`, `fulfilment.delivery_date`) or an array lookup
> `arrayName[key="…"]` (e.g. `product_fields[key="purchase_order"]`).

### Per-shopper state (cookies / session, not env)

- `ep_cart_mode` cookie — overrides the drawer/full default per shopper (Settings).
- `cart_view_mode` cookie — remembers list/grid choice.
- `ep_location` cookie — selected inventory location stamped onto added items.
- selected account (session) — account carts load after sign-in.
- `sessionStorage: ep_promo_suggestions` — persists promotion suggestions (not returned on cart GET).
- `localStorage: _store_ep_cart` — the active cart id.

---

## Feature: Cart presentation mode (drawer vs full page)

```gherkin
Feature: Open the cart as a drawer or a full page
  # Switch: NEXT_PUBLIC_DEFAULT_CART_MODE (overridable per shopper via Settings → ep_cart_mode cookie)

  Scenario: Drawer mode
    Given the cart mode is "drawer"
    When I click the header shopping-bag button
    Then a slide-in drawer opens over the current page

  Scenario: Full-page mode
    Given the cart mode is "full"
    When I click the header shopping-bag button
    Then I am taken to "/{lang}/cart"

  Scenario: Change my preference
    Given I open Settings
    When I switch the cart mode
    Then my choice is saved in the "ep_cart_mode" cookie
```

## Feature: Cart page layout (list vs grid)

```gherkin
Feature: Present the full cart in list or grid layout
  # Switch: NEXT_PUBLIC_CART_VIEW_MODE (overridable via cart_view_mode cookie)

  Scenario: List view (default)
    Given the cart view is "list"
    Then items render as rows in a two-column layout with a sticky summary panel
    And no variation-matrix or product-matrix API calls are made

  Scenario: Grid view
    Given the cart view is "grid"
    Then variation children are grouped under their parent product (matrix rows)
    And totals and the checkout actions move into the cart header bar
    And a "Bulk mode" toggle lets me stage quantity changes and "Update All" at once

  Scenario: Switching to list clears bulk staging
    Given I have staged bulk quantity changes in grid view
    When I switch to list view
    Then bulk mode is turned off and the staged quantities are cleared
```

## Feature: Multiple carts / requisitions

```gherkin
Feature: Manage more than one cart (authenticated shoppers)

  Scenario: Guest shopper
    Given I am not signed in
    Then the cart header shows a plain "Your Cart" title with no cart switcher

  Scenario: Authenticated shopper sees the active requisition
    Given I am signed in
    Then the cart header shows the active cart name and a switcher

  Scenario: Switch carts
    Given I am signed in and have more than one cart
    When I pick another cart from the switcher
    Then that cart's items load (with promotions) and it becomes active

  Scenario: Create a new cart
    Given I am signed in
    When I choose "Create New Cart" and enter a name
    Then a new cart is created and becomes the active cart

  Scenario: Per-cart actions
    Given I open the cart switcher
    Then I can clear a cart's items or delete a cart (each behind a confirm step)

  Scenario: Quote carts are hidden
    Then carts flagged as quotes are excluded from the cart list
```

> Saved carts can also be managed from **Account → Carts** (`/{lang}/account/carts`):
> a paginated table (10/page) with Edit (name/description), Select, Delete, and
> Clear-items actions, and an "Active" badge on the current cart.

## Feature: Line items

```gherkin
Feature: Review and adjust cart line items

  Scenario: Change quantity
    When I change a line's quantity
    Then the line updates; setting it to 0 removes the line
    And if the line has an inventory location, that location is re-sent on the update

  Scenario: Remove a line
    When I remove a line
    Then it is deleted and promotion suggestions are refreshed

  Scenario: Free gift lines
    Given a line is a free gift
    Then its quantity stepper and remove control are disabled

  Scenario: Bundle line
    Given a line is a bundle
    Then a "What's included" panel lists each component with name, quantity and price

  Scenario: Location shown per line
    # Switch: NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION
    Given multi-location is enabled and the line has a location
    Then the location name is shown with a pin icon on the line

  Scenario: Custom fields shown per line
    Given a line has product fields (custom inputs)
    Then they are shown as label/value pairs

  Scenario: Pricing
    Then each line shows a unit price and line total
    And a discounted line shows the original total struck through
    And a zero-priced line shows "Free"

  Scenario: Subscription line
    Given a line is a subscription
    Then a subscription badge with the plan/frequency is shown
```

## Feature: Grouping & inline-editable fields

```gherkin
Feature: Group lines and edit custom inputs on the cart

  Scenario: Group by custom input
    # Switch: NEXT_PUBLIC_CART_GROUP_BY
    Given a grouping selector is configured
    Then lines are bucketed under collapsible group headers by that value
    And with no selector configured, no grouping headers are shown

  Scenario: Inline-edit a custom input
    # Switch: NEXT_PUBLIC_CART_EDITABLE_INPUTS
    Given an editable-inputs selector is configured
    Then each named field renders as a text input on the line
    When I edit a value and click "Update"
    Then the full merged custom_inputs are saved for that line

  Scenario: Avoid duplicate display
    Given a product field is also configured as editable
    Then it is not additionally shown as a read-only field
```

## Feature: Promotions & coupons

```gherkin
Feature: Apply discounts to the cart

  Scenario: Apply a promo code
    When I enter a promo code and apply it
    Then the code is upper-cased and applied, or the error detail is shown
    And applied codes appear as removable chips (auto-applied codes are hidden)

  Scenario: Remove a promo code
    When I remove an applied code chip
    Then the promotion is removed from the cart

  Scenario: Promotion suggestions
    Given the cart returns promotion suggestions with SKU targets
    Then they are shown inline on the cart (offers section / carousel)
    And the global suggestion modal is suppressed on the cart page
    But on other pages a new suggestion after an add opens the suggestion modal
```

## Feature: Totals & proceed to checkout

```gherkin
Feature: Show totals and move to checkout

  Scenario: Totals
    Then the cart shows a subtotal and total
    And a discount line appears only when there is a cart-level discount
    And shipping and tax show a "calculated at checkout" note rather than an estimate

  Scenario: Checkout CTA
    When I click Checkout (drawer, summary panel, or grid header)
    Then I am taken to "/{lang}/checkout"
    And the CTA is disabled when the cart is empty

  Scenario: Request a quote (authenticated)
    Given I am signed in
    Then a "Request quote" action is available that goes to "/{lang}/quote-request"
```

## Feature: States (empty, loading, marketing mode)

```gherkin
Feature: Communicate cart state

  Scenario: Empty full cart
    Given the cart has loaded and has no items
    Then an empty state with a "Browse catalog" button (→ home) is shown

  Scenario: Empty drawer
    Given the drawer is open and the cart is empty
    Then an empty message with a "Browse products" link (closes the drawer) is shown

  Scenario: Loading
    Given the cart is initializing or a mutation is in flight
    Then a skeleton / loading state is shown instead of a false empty state

  Scenario: Marketing mode while signed out
    # Switch: NEXT_PUBLIC_MARKETING_MODE
    Given marketing mode is on and I am not signed in
    Then no cart is created or loaded until I sign in
```

## Feature: Add-to-cart behaviour (context)

```gherkin
Feature: How items reach the cart

  Scenario: Single add
    When a product is added from a PDP or card
    Then it is added as one line, with location stamped when multi-location is enabled

  Scenario: Batch add (bulk / quick order)
    When multiple items are added at once
    Then the request uses add_all_or_nothing = false, so available items are added
        even if some fail

  Scenario: Sign-in merges the guest cart
    Given I have a guest cart and then sign in
    Then my guest cart is merged into an account cart (partial success allowed)

  Scenario: Location is required on updates
    # Switch: NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION
    Given a line has a location
    Then every quantity/custom-input/bulk update re-sends that location
```

---

## Quick reference — one line per switch

| Want to… | Set |
|---|---|
| Send the header cart button to the full page | `NEXT_PUBLIC_DEFAULT_CART_MODE=full` |
| Default the cart page to grid (matrix + bulk update) | `NEXT_PUBLIC_CART_VIEW_MODE=grid` |
| Group lines by a PO / custom field | `NEXT_PUBLIC_CART_GROUP_BY=product_fields[key="purchase_order"]` |
| Let shoppers edit custom fields on the cart | `NEXT_PUBLIC_CART_EDITABLE_INPUTS=po_number,…` |
| Tag lines with an inventory location | `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION=true` |
| Require sign-in before a cart exists | `NEXT_PUBLIC_MARKETING_MODE=true` |
| Change cart currency | `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` |
