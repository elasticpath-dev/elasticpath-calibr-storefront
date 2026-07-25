# Checkout — Payment Step (BDD)

This document describes **the payment step of checkout** — payment methods, order
placement, confirmation, and errors — written as BDD scenarios so a non-author can
understand the behaviour and the switches that change it.

- **Route:** `/{lang}/checkout` (step **2 Payment**, after shipping)
- **Redirect return:** `/{lang}/payment-return` (3DS / Klarna / Clearpay / PayPal)
- **Confirmation:** `/{lang}/order-confirmation/{orderId}`
- **Primary source files:**
  - `src/components/checkout/CheckoutFlow.tsx` (method accordion, Stripe Elements, place-order dispatch)
  - `src/components/checkout/StripePaymentForm.tsx`, `POPaymentForm.tsx`, `OrderSummary.tsx`
  - `src/hooks/use-ep-stripe-payment.ts`, `use-ep-paypal-payment.ts`, `use-ep-cod-payment.ts`, `use-ep-po-payment.ts`
  - `src/lib/stripe.ts` (`getStripePromise`, `getStripeGateway`), `src/lib/manual-payment-error.ts`
  - `src/app/[lang]/(checkout)/payment-return/*`, `src/components/order/OrderConfirmationDetail.tsx`

> There are four payment methods: **Card (Stripe / EP Payments)**, **PayPal**,
> **Cash on Delivery**, and **Purchase Order**. Card uses Stripe deferred-intent
> mode (EP creates the PaymentIntent server-side at `paymentSetup`).

---

## Environment variables that change the payment step

Read in `src/lib/tenant-config.ts` (`payments` block); in multi-tenant mode the
same fields can come from the remote config per-hostname.

### Directly change the payment step

| Env var | Config field | Values | Default | Effect |
|---|---|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `payments.stripePublishableKey` | string | `""` | Gates the **Card** method and loads Stripe.js. Empty → no card option (default method becomes Purchase Order). |
| `NEXT_PUBLIC_STRIPE_ACCOUNT_ID` | `payments.stripeAccountId` | string | `undefined` | Connected account for **EP Payments**. Set → gateway `elastic_path_payments_stripe`; unset → `stripe_payment_intents`. |
| `NEXT_PUBLIC_PAYPAL_ENABLED` | `payments.paypalEnabled` | `true`/`false` | `false` | Gates the **PayPal** method. |
| `NEXT_PUBLIC_DEFAULT_SHOPPING_MODE` + `shoppingModeLocked` | `ui.defaultShoppingMode` | `b2c`/`b2b` | `b2c` | Gates **Purchase Order**: hidden for B2C on an EP-hosted store; available for B2B or self-hosted. |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` | `currency.*` | ISO codes | `USD` | Currency + amount for Stripe Elements and totals. |
| `NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION` | `inventory.multiLocation` | `true`/`false` | `false` | Re-asserts each line's stock location before the order allocates stock. |

> **Cash on Delivery** is always available (no gate).

### Per-shopper state (session)

- `ep_am_token` cookie / account credentials — authenticated vs guest order body (`contact` vs `customer`), saved addresses, subscription customer id.
- localStorage `_store_ep_cart` — the cart id used on the PayPal return page (where the cart context isn't initialised).

---

## Feature: Choosing a payment method

```gherkin
Feature: Offer the enabled payment methods

  Scenario: Card
    # Switch: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    Given a Stripe publishable key is configured
    Then a Card option is shown and is the default method

  Scenario: PayPal
    # Switch: NEXT_PUBLIC_PAYPAL_ENABLED
    Given PayPal is enabled
    Then a PayPal option is shown

  Scenario: Cash on Delivery
    Then a Cash on Delivery option is always shown

  Scenario: Purchase Order
    Given I am a B2B shopper, or the store is self-hosted
    Then a Purchase Order option is shown (with a required PO number)

  Scenario: No card key
    Given no Stripe key is configured
    Then the default method falls back to Purchase Order (or Cash on Delivery)
```

## Feature: Card payment (Stripe / EP Payments)

```gherkin
Feature: Pay by card

  Scenario: Card form
    Given the Card method is selected
    Then Stripe Elements renders a card form (with Link email) in deferred-intent mode
    And the amount and currency come from the cart

  Scenario: Subscriptions
    Given the cart contains a subscription
    Then the card is set up for off-session future use

  Scenario: Placing a card order
    When I place the order
    Then the cart is converted to an order
    And EP creates the PaymentIntent (elastic_path_payments_stripe or stripe_payment_intents)
    And the card is confirmed; extra authentication (3DS) redirects via /payment-return
    And on success I am taken to the order confirmation and the cart is cleared

  Scenario: Card declined or validation error
    Then the card error message is shown inline and the order is not completed
```

## Feature: PayPal

```gherkin
Feature: Pay with PayPal

  Scenario: Redirect to PayPal
    Given PayPal is selected
    When I place the order
    Then the order is created and I am redirected to PayPal (cart kept intact)

  Scenario: Return from PayPal
    Given I approved the payment and return with a PayerID
    Then the existing pending transaction is confirmed (not re-created)
    And the cart is cleared and I land on the order confirmation

  Scenario: Cancel at PayPal
    Given I cancelled at PayPal
    Then a cancelled screen is shown and my cart is left intact
```

## Feature: Manual methods (Cash on Delivery & Purchase Order)

```gherkin
Feature: Pay by a manual gateway

  Scenario: Cash on Delivery
    When I place a COD order
    Then the order is created and authorized on the manual gateway
    And I land on the order confirmation

  Scenario: Purchase Order
    Given I entered a PO number (required)
    When I place the order
    Then the PO number is recorded on the order and authorized on the manual gateway

  Scenario: Manual gateway disabled
    Given the manual gateway is disabled in the backend
    Then a clear "manual gateway disabled" message is shown
```

## Feature: Placing the order

```gherkin
Feature: Submit the order

  Scenario: Billing required
    Given no billing address has been chosen
    When I place the order
    Then a "billing required" error blocks submission

  Scenario: Placing state
    Given the order is being placed
    Then the place-order button is disabled and shows a "placing order" state

  Scenario: Stock location reconciled
    # Switch: NEXT_PUBLIC_EP_INVENTORIES_MULTI_LOCATION
    Given multi-location is enabled
    Then each line's stock location is re-asserted before the order allocates stock
```

## Feature: Totals at payment

```gherkin
Feature: Show what the shopper will pay

  Scenario: Summary panel
    Then the order summary shows each line, subtotal, shipping (or "Free"),
        tax (or "Included") and the total
    And the B2C hidden shipping line is split back out so it isn't double-counted
```

## Feature: Confirmation

```gherkin
Feature: Confirm the order

  Scenario: Thank-you page
    Given the order was placed
    Then I land on "/{lang}/order-confirmation/{orderId}"
    And I see the order reference, items, price summary and shipping/billing addresses
```

## Feature: Guest vs authenticated

```gherkin
Feature: Differences by sign-in state

  Scenario: Order identity
    Given I am signed in
    Then the order is placed with my account contact details
    But as a guest the order is placed with the customer details I entered

  Scenario: Subscriptions off-session
    Given I am signed in and buying a subscription
    Then my Stripe customer id is attached for future off-session charges
```

> **Errors of note:** insufficient-stock/allocation failures are **not** specially
> handled — they surface as the generic "order could not be created" message
> (the checkout call's error isn't individually inspected). `syncItemLocations`
> is a best-effort pre-order reconcile and never blocks checkout.

---

## Quick reference — one line per switch

| Want to… | Set |
|---|---|
| Enable card payments | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=…` |
| Use EP Payments (connected account) | `NEXT_PUBLIC_STRIPE_ACCOUNT_ID=…` |
| Enable PayPal | `NEXT_PUBLIC_PAYPAL_ENABLED=true` |
| Offer Purchase Order to B2C | run self-hosted (not EP-hosted) or use B2B mode |
| Change payment currency | `NEXT_PUBLIC_DEFAULT_CURRENCY` / `NEXT_PUBLIC_CURRENCIES` |

> See also **[checkout-shipping.md](checkout-shipping.md)** for the shipping step.
