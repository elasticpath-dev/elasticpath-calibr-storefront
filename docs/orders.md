# Orders

What the storefront supports for reviewing past orders, in the account area.

- **Routes:** `/{lang}/account/orders` (list) · `/{lang}/account/orders/{orderId}` (detail)
- **Primary source files:** `src/components/account/tabs/OrdersTab.tsx`,
  `src/components/account/OrderDetail.tsx`, `src/hooks/use-paginated-orders.ts`

> Requires being signed in. No env flags gate order history.

---

## Capabilities

### Order history
- Paginated list (10 per page) of the account's orders. Each row shows order number, placed date, total, and three independent status badges:
  - **Order status** — complete / incomplete / cancelled / processing
  - **Payment status** — paid / unpaid / authorized / refunded / partially paid / partially authorized
  - **Shipping status** — fulfilled / unfulfilled
- **Reorder** — adds every item from a past order back into the current cart in one action.

> The list intentionally does **not** show an item-count column.

### Order detail
- Full breakdown of a single order: line items (image, name, SKU, quantity, unit price, line total, any line-level tax/discount) and a price summary (subtotal, tax, shipping, discount, grand total).
- Shipping adapts to how the order was placed: B2B shipping-group orders show items grouped by shipment with each group's address; otherwise a single shipping address is shown alongside billing.
- Reorder is available from the detail view as well as the list.

---

## Behaviour scenarios (BDD)

```gherkin
Feature: Review orders

  Scenario: Order list
    Then orders list with Order ID, Date, Status, Payment, Shipping and Total (10 per page)
    And each order ID links to its detail page

  Scenario Outline: Status badges
    Given an order's "<field>" is "<value>"
    Then a "<variant>" badge is shown
    Examples:
      | field    | value       | variant |
      | order    | complete    | success |
      | order    | cancelled   | error   |
      | payment  | paid        | success |
      | payment  | unpaid      | error   |
      | shipping | fulfilled   | success |
      | shipping | unfulfilled | warning |

  Scenario: Reorder
    When I click "Add all to cart" on an order (list or detail)
    Then all its items are added to my cart

  Scenario: Order detail
    When I open an order
    Then I see its number, date, status badges, line items, price summary and addresses
    And B2B shipping-group orders show items grouped by shipment
```

---

**Related:** [checkout.md](checkout.md) · [account.md](account.md) · [cart.md](cart.md)
