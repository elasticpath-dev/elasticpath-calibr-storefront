# Checkout — Shipping Step (BDD)

This document describes **the shipping/delivery step of checkout** — contact info,
addresses, and shipping method selection — written as BDD scenarios so a non-author
can understand the behaviour and the switches that change it.

- **Route:** `/{lang}/checkout` (a single page with two in-page steps: **1 Shipping** → **2 Payment**). There is no separate `/shipping` URL.
- **Primary source files:**
  - `src/app/[lang]/(checkout)/checkout/page.tsx` + `(checkout)/layout.tsx`
  - `src/components/checkout/CheckoutFlow.tsx` (orchestrator; owns the two steps)
  - `src/components/checkout/B2CDeliverySection.tsx` (B2C: single address + option)
  - `src/components/checkout/ShippingGroupManager.tsx` (B2B: multi-shipment)
  - `src/components/checkout/BillingAddressSection.tsx`, `CheckoutUserInfo.tsx`
  - `src/components/checkout/shipping/*` (ShipmentCard, CreateShipmentForm, useShippingMethods, …)
  - `src/app/api/shipping/details/route.ts` (shipping methods — currently hard-coded)
  - `src/hooks/use-account-addresses.ts`

> The shipping step has **two completely different implementations** chosen by
> shopping mode: **B2C** = one address + one shipping option; **B2B** = multiple
> shipments ("shipping groups"), each with its own address, method, and assigned items.

> **Note:** `CheckoutForm.tsx` / `CheckoutPageContent.tsx` / `use-checkout.ts` are
> a legacy path **not** used by the live checkout route.

---

## Environment variables that change the shipping step

Read in `src/lib/tenant-config.ts`; in multi-tenant mode the same fields can come
from the remote config per-hostname.

### Directly change the shipping step

| Env var | Config field | Values | Default | Effect |
|---|---|---|---|---|
| `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE` | `ui.defaultShoppingMode` | `b2c`/`b2b` | `b2c` | Selects the delivery UI: B2C single-address vs B2B multi-shipment. |
| *(derived)* `shoppingModeLocked` | — | — | — | `true` when the EPCC endpoint is Elastic Path–hosted → forces B2C and ignores the mode cookie. |
| `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION` | `inventory.multiLocation` | `true`/`false` | `false` | Enables per-line stock location; each cart-item update re-sends its location, reconciled again before order placement. |
| `NEXT_PUBLIC_MARKETING_MODE` | `features.marketingMode` | `true`/`false` | `false` | Signed-out shoppers have no cart/token; checkout lands on the empty-cart state until sign-in. |
| `REQUIRE_LOGIN` (server) | `auth.requireLogin` | `true`/`false` | `false` | Forces authentication before any page (incl. checkout) via the proxy. |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` | `currency.*` | ISO codes | `USD` | Currency for cart totals. (Note: the shipping-methods API is currently hard-coded to USD.) |

### Per-shopper state (cookies / session)

- `ep_shopping_mode` cookie — B2C/B2B choice (ignored when mode is locked).
- `ep_am_token` cookie — signed-in state (drives saved addresses, contact prefill).
- `ep_location` cookie — stock location stamped on cart lines.
- localStorage `ep-shipment-names-{cartId}` / `ep-shipment-estimates-{cartId}` — B2B shipment names & delivery-date estimates.

---

## Feature: Contact information

```gherkin
Feature: Capture who the order is for

  Scenario: Guest shopper
    Given I am not signed in
    Then a Contact information card requires first name, last name and a valid email

  Scenario: Authenticated shopper
    Given I am signed in
    Then my name and email are shown in the header and pre-filled from my account
    And no contact card is shown for a physical order

  Scenario: Authenticated shopper, digital-only order
    Given I am signed in and every item is digital
    Then a contact card appears with a "Use my account details" checkbox
    When I uncheck it
    Then I can edit the first name, last name and email
```

## Feature: Delivery address (B2C)

```gherkin
Feature: Choose where a B2C order ships
  # Active when shopping mode is B2C

  Scenario: Guest enters an address
    Given I am a guest
    When I fill in the address form and confirm
    Then a read-only address card with a "Change" link is shown

  Scenario: Signed-in shopper picks a saved address
    Given I am signed in
    Then I can pick a saved address or "+ Create new address"
    When I create a new address
    Then it is saved to my account and selected

  Scenario: Digital-only order skips delivery
    Given every item is digital
    Then the delivery section is skipped entirely
```

## Feature: Shipments (B2B multi-shipment)

```gherkin
Feature: Split a B2B order into shipments
  # Active when shopping mode is B2B

  Scenario: Create a shipment
    When I create a shipment with an address, a shipping method and a delivery estimate
    Then a shipment card is shown with its assigned items

  Scenario: Assign items to shipments
    Then I can drag items (or use the row menu) to move them between shipments
    And I can split a line across shipments by quantity
    And I must assign every item to a shipment before continuing

  Scenario: Multiple destinations
    Then each shipment can target a different address (multi-destination shipping)
```

## Feature: Billing address

```gherkin
Feature: Choose a billing address

  Scenario: Same as shipping
    Given there is a single shipping address
    Then a "Same as shipping" option is available and selected by default

  Scenario: Own billing address required
    Given the order has multiple shipping groups, or is a digital-only B2C order
    Then "Same as shipping" is hidden and an explicit billing address must be chosen

  Scenario: Guest vs authenticated
    Given I add a new billing address
    Then a guest's address is kept in page state only
    And a signed-in shopper's address is saved to their account

  Scenario: Billing is required to place the order
    Given I have not chosen a billing address
    When I try to place the order
    Then a "billing required" error blocks submission
```

## Feature: Shipping methods

```gherkin
Feature: Pick a shipping method

  Scenario: Available methods
    Then I can choose Standard (free, 5–7 days), Expedited (2–3 days) or Overnight (next day)
    And methods are listed in sort order
    And a zero-cost method shows "Free"

  Scenario: B2C pricing
    Given I select a paid shipping method in B2C
    Then the shipping cost is applied to the cart as a hidden shipping line
    And selecting a free method removes any prior shipping charge

  Scenario: B2B pricing
    Given each shipment has its own method
    Then the shipping total is the sum of the shipments' shipping costs
```

> The shipping methods are currently **hard-coded** in `src/app/api/shipping/details/route.ts`
> (Standard/Expedited/Overnight, USD) — they are not read from EP shipping config.

## Feature: Proceeding to payment

```gherkin
Feature: Move from shipping to payment

  Scenario: B2C ready
    Given a delivery address is confirmed and a shipping option is applied to the cart
    Then "Continue to payment" is enabled

  Scenario: B2B ready
    Given at least one shipment exists and every shippable item is assigned
    Then "Continue to payment" is enabled

  Scenario: Not ready yet
    Given the shipping step is incomplete
    Then "Continue to payment" is disabled with a hint
```

## Feature: States

```gherkin
Feature: Communicate checkout state

  Scenario: Loading
    Given the cart is initializing, shipping is loading, or the shopping mode is not yet known
    Then a checkout skeleton is shown

  Scenario: Empty cart
    Given the cart has finished loading and has no items (and no redirect is in progress)
    Then an empty-cart panel with a "Continue shopping" link is shown

  Scenario: Errors
    Then field validation errors, a billing-required error, and per-action toasts
        are shown as appropriate

  Scenario: Marketing mode / require login
    Given marketing mode is on and I am signed out
    Then I have no cart until I sign in
    And when REQUIRE_LOGIN is on, checkout redirects me to sign in first
```

---

## Quick reference — one line per switch

| Want to… | Set |
|---|---|
| Use B2B multi-shipment delivery | `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE=b2b` (only if the endpoint isn't EP-hosted/locked) |
| Track stock location through checkout | `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION=true` |
| Require sign-in before checkout | `REQUIRE_LOGIN=true` |
| Hold the store until sign-in | `NEXT_PUBLIC_MARKETING_MODE=true` |
| Change checkout currency | `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` |

> See also **[checkout-payment.md](checkout-payment.md)** for the payment step.
