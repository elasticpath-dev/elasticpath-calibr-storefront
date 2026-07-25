# Account — Functional Specification (BDD)

This document describes **everything the account area does** — profile, addresses,
orders, carts, quotes and subscriptions — written as BDD scenarios so a non-author
can understand the behaviour and the switches that change it.

- **Base route:** `/{lang}/account` → redirects to `/{lang}/account/personal`
- **Tabs:** `personal`, `addresses`, `orders`, `carts`, `quotes`, `subscriptions`
- **Primary source files:**
  - `src/app/[lang]/(app)/account/*` (routes; each tab is a thin server page)
  - `src/components/account/AccountPageContent.tsx` (layout, sidebar nav, auth gate)
  - `src/components/account/tabs/*` (PersonalTab, AddressesTab, OrdersTab, CartsTab, QuotesTab, SubscriptionsTab)
  - `src/components/account/OrderDetail.tsx`, `SubscriptionDetail.tsx`, `QuoteDetail.tsx`
  - Hooks: `use-account-addresses.ts`, `use-paginated-orders.ts`, `use-paginated-carts.ts`, `use-subscriptions.ts`
  - `src/lib/api/quotes.ts` (hand-rolled `/v2/quotes` client)

> **Access:** the whole account area requires being signed in. There are **no
> feature flags** gating individual tabs — all six render for any authenticated
> account member. Access is controlled entirely by client auth state
> (`isAuthenticated` / a selected account).

---

## Environment variables that change the account area

There are **no** account-specific env flags. All account data is scoped to the
signed-in account member's bearer token and gated by auth state, not config.

- `NEXT_PUBLIC_PURCHASE_HISTORY_ENABLED` (`features.purchaseHistoryEnabled`) exists
  but is used **only on the product detail page**, not in the account area.
- `NEXT_PUBLIC_EPCC_ENDPOINT_URL` / `NEXT_PUBLIC_EPCC_CLIENT_ID` provide catalog/account access (global).

### Per-shopper state (session, not env)

- Account-member credentials (localStorage `ep_account_member_credentials` + cookie `ep_am_token`).
- Selected account — B2B members with more than one account can switch (Personal tab); switching re-scopes all account data.

---

## Feature: Access & navigation

```gherkin
Feature: Reach and navigate the account area

  Scenario: Signed-out shopper is redirected
    Given I am not signed in
    When I open any "/{lang}/account/..." page
    Then I am redirected to the home page

  Scenario: Default tab
    When I open "/{lang}/account"
    Then I am redirected to "/{lang}/account/personal"

  Scenario: Sidebar navigation
    Given I am signed in
    Then a sidebar shows Personal, Addresses, Orders, Carts, Quotes and Subscriptions
    And the tab matching the current URL is highlighted
    And my initials, member name and account name are shown
```

## Feature: Personal details & account switching

```gherkin
Feature: View my profile and switch accounts

  Scenario: View personal details
    Then I see my member name, member email, account name and account ID (read-only)

  Scenario: Switch between accounts (B2B)
    Given my member belongs to more than one account
    Then an account switcher lists all my accounts
    And the active account is badged "Active" and disabled
    When I select another account
    Then the app re-scopes to that account and refreshes
```

> There is no editing of the member profile, and no account-members management
> (inviting/listing other members) in the UI.

## Feature: Addresses

```gherkin
Feature: Manage my saved addresses

  Scenario: List addresses
    Then my saved addresses are shown as cards with Edit and Delete actions
    And an "add address" tile is available
    And an empty state is shown when I have none

  Scenario: Add an address
    When I open the add-address form and fill it in
    Then required fields (first name, last name, line 1, city, county, postcode, country) are validated
    And the address is saved to my account

  Scenario: Edit an address
    When I edit an address and save
    Then the changes are persisted

  Scenario: Delete an address
    When I delete an address
    Then a confirmation is required before it is removed
```

> Addresses are keyed to the selected account. There is **no** "default
> shipping/billing" designation anywhere in the UI.

## Feature: Orders

```gherkin
Feature: Review my orders

  Scenario: Order list
    Then orders are listed with columns: Order ID, Date, Status, Payment, Shipping, Total
    And each order ID links to its detail page
    And the list is paginated (10 per page)

  Scenario Outline: Status badges
    Given an order has "<field>" value "<value>"
    Then a "<variant>" badge is shown

    Examples:
      | field    | value          | variant |
      | order    | complete       | success |
      | order    | processing     | info    |
      | order    | cancelled      | error   |
      | payment  | paid           | success |
      | payment  | unpaid         | error   |
      | shipping | fulfilled      | success |
      | shipping | unfulfilled    | warning |

  Scenario: Reorder
    When I click "Add all to cart" on an order (list or detail)
    Then all of that order's items are added to my cart

  Scenario: Order detail
    When I open an order
    Then I see its number, date, status badges, line items, price summary,
        and shipping/billing addresses
```

> The order list intentionally does **not** show an item-count column.

## Feature: Carts (saved-cart management)

```gherkin
Feature: Manage my saved carts

  Scenario: Cart list
    Then my carts are listed with Details (name + description), Items, Total, Created, Updated
    And the currently active cart is badged "Active"
    And the list is paginated (10 per page)

  Scenario: Cart actions
    When I open a cart's menu
    Then I can Edit (name/description), Select (switch to it), Delete, or Clear its items
    And Select is disabled for the already-active cart
    And Delete and Clear require confirmation
```

## Feature: Quotes

```gherkin
Feature: Review my quotes

  Scenario: Quote list
    Then my quotes are listed with ID, Date, Buyer, Status and Total
    And each row links to the quote detail (no pagination on quotes)

  Scenario Outline: Quote status badges
    Given a quote status is "<status>"
    Then a "<variant>" badge is shown

    Examples:
      | status   | variant |
      | draft    | default |
      | pending  | warning |
      | active   | info    |
      | accepted | success |
      | rejected | error   |
      | expired  | default |

  Scenario: Quote detail (view-only)
    When I open a quote
    Then I see its name/id, dates, status, line items, list total,
        contact and request details, and ship-to address
    And there are no accept/reject or convert-to-order actions in this view
```

> **Requesting** a quote happens in checkout, not the account area
> (`/{lang}/quote-request`, entered from the cart). It builds a quote from the
> current cart, clears the cart, and the quote then appears in this Quotes tab.

## Feature: Subscriptions

```gherkin
Feature: Manage my subscriptions

  Scenario: Subscription list
    Then subscriptions are listed with Offering, Status, Plan, Price, Started and Next Billing
    And the list is paginated (10 per page)

  Scenario Outline: Status badges
    Given a subscription is "<state>"
    Then a "<variant>" badge is shown

    Examples:
      | state     | variant |
      | active    | success |
      | inactive  | warning |
      | paused    | info    |
      | canceled  | error   |
      | suspended | error   |
      | pending   | info    |

  Scenario: Manage a subscription
    Given I open a subscription's detail
    Then Pause, Resume and Cancel actions appear only when the plan allows them
        and match the current state (e.g. Resume only when paused)
    When I take an action
    Then the subscription state is updated and the view refreshes
    And Cancel requires an inline confirmation

  Scenario: Invoices
    Then the subscription detail lists its invoices with number, period, amount and status
    And outstanding invoices are flagged
```

---

## Quick reference

| Area | Route | Key behaviour |
|---|---|---|
| Personal | `/account/personal` | Read-only profile + B2B account switcher (when >1 account) |
| Addresses | `/account/addresses` | Add/edit/delete saved addresses (no default designation) |
| Orders | `/account/orders` | Paginated list, status badges, reorder, detail page |
| Carts | `/account/carts` | Manage saved carts (edit/select/delete/clear), active badge |
| Quotes | `/account/quotes` | View-only list + detail (request happens at checkout) |
| Subscriptions | `/account/subscriptions` | List + detail; pause/resume/cancel (capability-gated); invoices |

> All account access requires sign-in; no env flag turns any tab on or off.
