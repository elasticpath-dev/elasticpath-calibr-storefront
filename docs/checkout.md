# Checkout

What the storefront supports for turning a cart into a placed order — a two-step
flow (**Delivery** → **Payment**) on a single `/{lang}/checkout` page.

- **Route:** `/{lang}/checkout` (in-page steps: 1 Shipping → 2 Payment). No separate `/shipping` or `/payment` URL.
- **Redirect return:** `/{lang}/payment-return` (3DS / Klarna / Clearpay / PayPal)
- **Confirmation:** `/{lang}/order-confirmation/{orderId}`
- **Primary source files:** `src/components/checkout/CheckoutFlow.tsx` (orchestrator),
  `B2CDeliverySection.tsx`, `ShippingGroupManager.tsx`, `BillingAddressSection.tsx`,
  `StripePaymentForm.tsx`, `POPaymentForm.tsx`,
  `src/hooks/use-ep-stripe-payment.ts` (+ paypal/cod/po), `src/lib/stripe.ts`,
  `src/app/api/shipping/details/route.ts`

> The delivery step has **two implementations** chosen by shopping mode: **B2C**
> (one address + one method) and **B2B** (multiple shipments/"shipping groups").
> `CheckoutForm.tsx` / `use-checkout.ts` are a legacy path not used by the live route.

---

## Capabilities

### Overall flow
- Two-step checkout with a visual progress stepper: **Delivery** (addresses + shipping, plus contact for guests) → **Payment** (billing + method + place order).
- Which delivery experience renders depends on the B2C/B2B shopping-mode preference.

### Contact information
- **Guests** provide first name, last name and a valid email.
- **Authenticated** shoppers are pre-filled from their account (shown in the header). Digital-only orders show a "use my account details" checkbox that reveals editable fields when unchecked.

### B2B delivery — shipping groups
Cart items can be split across multiple shipments, each with its own address and method:
- Create a shipment: pick a saved address or enter one inline, choose a method (cost + delivery estimate), and select which items belong to it.
- Reassign items between shipments (including drag), or split a line's quantity across two shipments.
- Rename a shipment and set a delivery-date estimate; delete a shipment (items return to an "unassigned" pool).
- Every item must be assigned before continuing. Total shipping = sum of each shipment's method cost.

### B2C delivery — single address
A simpler flow with no shipping-group API:
- **Address:** registered shoppers pick a saved address (or add one via a modal, saved to their account); guests fill an inline form kept only in page state. Confirming collapses it to a read-only summary with a "Change" link.
- **Method:** once the address is confirmed, methods appear as radio options (name, window, cost or "Free"); selecting one applies the charge immediately (as a hidden cart custom item so totals stay correct).

### Digital-only orders (B2C)
- The delivery step skips address/shipping collection entirely.
- Guests still provide contact details; registered shoppers get the "use my account details" checkbox.
- EP still needs a `shipping_address`, so each field is submitted as a single space.
- Billing is still required, and "same as shipping" is not offered.

### Billing address
- Registered shoppers pick a saved address or add one (saved to account); guests can add one kept in page state only.
- **"Same as shipping"** is offered only when there's a single, unambiguous shipping address — not for B2B (multiple shipment addresses) or digital-only orders.

### Payment methods
| Method | Availability | Notes |
|---|---|---|
| **Card (Stripe)** | Only if a Stripe publishable key is set | Deferred-intent flow. Uses Elastic Path Payments (managed Stripe) if a Stripe account id is set, else the merchant's own Stripe. Subscription items request off-session future use. |
| **Purchase Order** | B2B always; B2C only on non–EP-hosted stores | Shopper enters a PO reference; no card captured. |
| **Cash on Delivery** | Always | No shopper input. |
| **PayPal** | Only if enabled | Redirect to PayPal Express Checkout; confirmed on return. |

Purchase Order and Cash on Delivery are **manual** methods: the order is created, then a transaction is recorded via EP's `manual` gateway (no external processor). If that gateway is disabled in Commerce Manager, the storefront detects EP's "gateway disabled" error and tells the operator where to enable it.

### Elastic Path–hosted lock
- If the EPCC endpoint is an Elastic Path SaaS domain, shopping mode is locked to B2C and Purchase Order is hidden — regardless of saved preference. Self-hosted/custom-domain stores are unaffected.

### Order confirmation
- Shows the placed order's items, price summary and addresses.
- Shipping-group details are only fetched/shown when the order actually used shipping groups (no wasted call for B2C/digital orders).

---

## Configuration

| Env var | Values | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE` | `b2c`/`b2b` | `b2c` | B2C single-address vs B2B multi-shipment delivery; also gates Purchase Order. |
| *(derived)* endpoint is EP-hosted | — | — | Locks B2C and hides Purchase Order. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | `""` | Gates the Card method + loads Stripe.js. |
| `NEXT_PUBLIC_STRIPE_ACCOUNT_ID` | string | `undefined` | EP Payments connected account (`elastic_path_payments_stripe` vs `stripe_payment_intents`). |
| `NEXT_PUBLIC_PAYPAL_ENABLED` | `true`/`false` | `false` | Gates the PayPal method. |
| `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION` | `true`/`false` | `false` | Re-asserts each line's stock location before the order allocates stock. |
| `NEXT_PUBLIC_MARKETING_MODE` | `true`/`false` | `false` | Signed-out shoppers have no cart; checkout shows the empty state until sign-in. |
| `REQUIRE_LOGIN` (server) | `true`/`false` | `false` | Forces authentication before any page (incl. checkout). |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` | ISO codes | `USD` | Currency for totals + Stripe Elements. |

> The shipping **methods** (Standard/Expedited/Overnight, USD) are currently
> **hard-coded** in `src/app/api/shipping/details/route.ts`, not read from EP shipping config.

**Per-shopper state:** `ep_shopping_mode`, `ep_am_token`, `ep_location` cookies; localStorage shipment names/estimates per cart.

---

## Behaviour scenarios (BDD)

### Delivery

```gherkin
Feature: Capture delivery details

  Scenario: Contact info
    Given I am a guest
    Then I must provide first name, last name and a valid email
    # Authenticated shoppers are pre-filled; digital-only shows a "use my account details" toggle

  Scenario: B2C address
    Given B2C mode
    Then I pick a saved address (or add one), or enter one inline as a guest
    And a digital-only order skips the delivery section

  Scenario: B2B shipments
    Given B2B mode
    Then I create shipments (address + method + items), and must assign every item before continuing

  Scenario: Billing
    Given a single shipping address exists
    Then "Same as shipping" is offered; otherwise an explicit billing address is required
```

### Shipping methods

```gherkin
Feature: Pick a shipping method

  Scenario: Options
    Then I can choose Standard (free), Expedited or Overnight, in sort order

  Scenario: Pricing
    Given B2C
    Then the selected method's cost is applied to the cart (free = no charge)
    # B2B: total shipping is the sum of each shipment's method cost
```

### Payment

```gherkin
Feature: Pay for the order
  # Switches: STRIPE key, STRIPE account id, PAYPAL enabled, shopping mode

  Scenario Outline: Method availability
    Given "<condition>"
    Then the "<method>" option is shown
    Examples:
      | condition                          | method           |
      | a Stripe publishable key is set    | Card             |
      | always                             | Cash on Delivery |
      | PayPal enabled                     | PayPal           |
      | B2B, or self-hosted store          | Purchase Order   |

  Scenario: Card order
    When I place a card order
    Then the cart converts to an order, EP creates the PaymentIntent, and the card is confirmed
    And extra authentication (3DS) redirects via /payment-return
    And on success I reach the confirmation and the cart is cleared

  Scenario: PayPal
    Then I'm redirected to PayPal (cart kept), and on return the pending transaction is confirmed

  Scenario: Manual gateway disabled
    Given the manual gateway is disabled
    Then a clear message tells the operator where to enable it
```

### Placing the order & states

```gherkin
Feature: Submit and confirm

  Scenario: Billing required
    Given no billing address chosen
    When I place the order
    Then a "billing required" error blocks submission

  Scenario: Confirmation
    Given the order was placed
    Then I land on "/{lang}/order-confirmation/{orderId}" with items, totals and addresses

  Scenario: Empty cart / require login
    Given the cart is empty (and no redirect in progress)
    Then an empty-cart panel is shown
    And when REQUIRE_LOGIN is on, checkout redirects me to sign in first
```

> **Errors of note:** insufficient-stock/allocation failures aren't specially
> handled — they surface as the generic "order could not be created" message.

---

## Quick reference

| Want to… | Set |
|---|---|
| Use B2B multi-shipment checkout | `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE=b2b` (non-EP-hosted only) |
| Enable card payments | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=…` |
| Use EP Payments (connected account) | `NEXT_PUBLIC_STRIPE_ACCOUNT_ID=…` |
| Enable PayPal | `NEXT_PUBLIC_PAYPAL_ENABLED=true` |
| Require sign-in before checkout | `REQUIRE_LOGIN=true` |

**Related:** [cart.md](cart.md) · [quotes.md](quotes.md) · [account.md](account.md) · [localization.md](localization.md)
