# Order Functional Document

What the storefront supports for reviewing past orders.

## Order history

- Paginated list of the account's orders, each showing an order number, placed date, item count, total, and three independent status badges: order status (complete/incomplete/cancelled/processing), payment status (paid/unpaid/authorized/refunded/partially paid/partially authorized), and shipping status (fulfilled/unfulfilled).
- **Reorder** — adds every item from a past order back into the current cart in one action.

## Order detail

- Full breakdown of a single order: line items (image, name, SKU, quantity, unit price, line total, any line-level tax/discount), and a price summary (subtotal, tax, shipping, discount, grand total).
- Shipping information adapts to how the order was placed: if it used B2B shipping groups, items are shown grouped by shipment with each group's address; otherwise a single shipping address is shown alongside the billing address.
- Reorder is available from the detail view as well as the list.

## Related documents

- [checkout.md](checkout.md) — how an order is created and what shipping information it carries
- [account.md](account.md) — where order history lives in the account area
- [cart.md](cart.md) — reordering adds items back into the cart
