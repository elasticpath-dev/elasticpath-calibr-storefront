# Subscriptions

What the storefront supports for recurring-purchase (subscription) products, from
initial purchase through ongoing management.

- **Purchase:** on the PDP (see [catalog-and-products.md](catalog-and-products.md))
- **Manage routes:** `/{lang}/account/subscriptions` (list) · `/{lang}/account/subscriptions/{subscriptionId}` (detail)
- **Primary source files:** `src/components/account/tabs/SubscriptionsTab.tsx`,
  `src/components/account/SubscriptionDetail.tsx`, `src/hooks/use-subscriptions.ts`

> Requires being signed in. No env flags gate subscriptions.

---

## Capabilities

### Purchasing a subscription
- A product is subscribable when Elastic Path has a subscription offering linked to it; where one exists the PDP shows a **One-time vs Subscribe** toggle.
- Subscribing exposes the offering's plans and pricing options (name, billing frequency, price per cycle); one-time and subscription purchases are mutually exclusive per cart line.
- Works with variation products too — the offering lookup resolves against the selected child variant, falling back to the parent's offering.

### Managing a subscription
From the account **Subscriptions** page:
- A paginated list (10 per page): offering name, status, plan, price, billing frequency, start date and next billing date.
- **Status** combines two signals into one colour-coded badge: a lifecycle state (pending, active, paused, canceled, suspended, closed) and a billing state (active/inactive) — e.g. "Active", "Inactive", "Paused", "Canceled", "Suspended", "Pending", "Closed".
- A **detail** view per subscription: offering, plan, pricing, next billing date, and full **invoice history** (invoice number, billing period, amount, paid/outstanding status).
- **Pause, resume and cancel** actions appear where the pricing option permits them (`can_pause`, `can_resume`, `can_cancel`, configured in EP) and match the current state. Cancelling requires confirmation; taking an action refreshes the displayed status immediately.

---

## Behaviour scenarios (BDD)

```gherkin
Feature: Purchase a subscription

  Scenario: Choose a plan
    Given a product has a subscription offering
    Then the PDP shows a One-time vs Subscribe toggle exposing the offering's plans/pricing
    And one-time and subscription are mutually exclusive per line
```

```gherkin
Feature: Manage subscriptions

  Scenario: List
    Then subscriptions list with Offering, Status, Plan, Price, Started and Next Billing (10 per page)

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

  Scenario: Actions
    Given I open a subscription's detail
    Then Pause, Resume and Cancel appear only when the plan allows them and match the current state
    When I take an action
    Then the state updates (Cancel requires confirmation) and the view refreshes

  Scenario: Invoices
    Then the detail lists invoices with number, period, amount and paid/outstanding status
```

---

**Related:** [catalog-and-products.md](catalog-and-products.md) · [account.md](account.md)
