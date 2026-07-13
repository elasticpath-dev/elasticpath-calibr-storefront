# Checkout Functional Document

What the storefront supports for turning a cart into a placed order.

## Overall flow

Two-step checkout with a visual progress stepper:

1. **Delivery** — address collection and shipping method (shape depends on B2B vs. B2C, see below), plus contact details for guests.
2. **Payment** — billing address, payment method selection, and order placement.

Which delivery experience renders is controlled by the shopping-mode preference (B2C or B2B) — see [localization.md](localization.md) for how that preference is set and locked.

## B2B delivery: shipping groups

Cart items can be split across multiple shipments, each with its own address and shipping method:

- Create a shipment: pick a saved address or enter one inline, choose a shipping method (with cost and delivery estimate), and select which cart items belong to it.
- Reassign items between shipments (including dragging), or split a single line's quantity across two shipments.
- Rename a shipment and set a delivery-date estimate for it.
- Delete a shipment, which returns its items to an "unassigned" pool.
- Every item must be assigned to a shipment before the shopper can continue to payment.
- Total shipping cost is the sum of every shipment's method cost.

## B2C delivery: single address

A simpler flow with no shipping-group API involved at all:

- **Address**: registered shoppers pick from saved addresses (or add a new one via a modal, which persists to their account); guests fill in an inline form that is kept only in page state, never saved to any account.
- Confirming the address collapses it into a read-only summary with a "Change" link.
- **Shipping method**: once the address is confirmed, available methods appear as radio options (name, delivery window, cost, or "Free"). Selecting one applies the charge immediately.
- The shipping charge is applied as a hidden cart custom item (so cart/order totals are correct) rather than through shipping groups — this keeps the B2C UX to "one address, one method" without B2B's shipment-splitting machinery.

## Digital-only orders

When every item in the cart is flagged digital (see [catalog.md](catalog.md)):

- The delivery step skips address/shipping collection entirely.
- Guests still provide contact details (name + email); registered shoppers see a "use my account name and email" checkbox, checked by default, that reveals editable fields if unchecked.
- Because Elastic Path still requires a `shipping_address` on the order, every field is submitted as a single space rather than a real address.
- Billing address is still required, and — since there's no real shipping address to match — "same as shipping" is not offered; the shopper must pick or enter a real billing address.
- This behavior only applies in B2C mode; B2B (shipping-group) checkout is unaffected by the digital flag.

## Billing address

- Registered shoppers choose from saved addresses or add a new one (saved to their account) via a modal.
- Guests can add a billing address in the same modal, but it's kept in page state only and never posted to the account API — it's used solely for this order.
- "Same as shipping" is offered only when there's a single, unambiguous shipping address to copy (standard B2C with a physical delivery) — not for B2B (multiple shipment addresses) or digital-only orders.

## Payment methods

| Method | Availability | Notes |
|---|---|---|
| **Card (Stripe)** | Shown only if `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set | Deferred-intent flow (card details collected before the PaymentIntent exists). Uses Elastic Path Payments (managed Stripe) if `NEXT_PUBLIC_STRIPE_ACCOUNT_ID` is set, otherwise the merchant's own Stripe account. Subscription items request off-session future usage so recurring charges can be made later. |
| **Purchase Order** | B2B mode always; B2C only on non–Elastic-Path-hosted stores (hidden for B2C when the endpoint is an Elastic Path SaaS domain) | Shopper enters a PO reference number; no card details captured. |
| **Cash on Delivery** | Always available | No input captured from the shopper at all. |

Purchase Order and Cash on Delivery are both **manual payment methods**: the order is created directly, then a transaction is recorded against it via Elastic Path's `manual` payment gateway — there's no external processor round-trip. If that gateway isn't enabled in Commerce Manager, the storefront detects EP's "Gateway disabled" error and tells the shopper (in practice, the store operator) exactly where to turn it on (Commerce Manager → Settings → Payment → Manual).

## Elastic Path–hosted lock

If `NEXT_PUBLIC_EPCC_ENDPOINT_URL` points at an Elastic Path–hosted (SaaS) domain, shopping mode is locked to B2C and Purchase Order is hidden from checkout, regardless of any saved preference. Self-hosted/custom-domain stores are unaffected and can use B2B checkout and Purchase Order normally. See [localization.md](localization.md) for the full lock behavior.

## Order confirmation

- Displays the placed order's items, price summary, and addresses.
- Shipping-group details are only fetched and shown when the order actually used shipping groups (detected from the order's own items, avoiding a wasted API call for every B2C/digital order that never used them).

## Related documents

- [cart.md](cart.md) — what's in the cart when checkout begins
- [quotes.md](quotes.md) — the B2B alternative to placing an order directly
- [account.md](account.md) — saved addresses used at checkout
- [localization.md](localization.md) — shopping-mode and currency behavior referenced above
