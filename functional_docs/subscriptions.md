# Subscription Functional Document

What the storefront supports for recurring-purchase (subscription) products, from initial purchase through ongoing management.

## Purchasing a subscription

- A product is subscribable when Elastic Path has a subscription offering linked to it. Where one exists, the PDP presents a One-time vs. Subscribe toggle.
- Subscribing exposes the offering's plans and pricing options (name, billing frequency, price per cycle); one-time and subscription purchases are mutually exclusive per cart line.
- Works with variation products too — the offering lookup resolves against the selected child variant, falling back to the parent offering if the child has none of its own.
- See [catalog.md](catalog.md) for how this fits into the PDP.

## Managing an existing subscription

From the account "Subscriptions" page:

- A paginated list of the account's subscriptions, each showing the offering name, status, plan, price, billing frequency, start date, and next billing date.
- **Status** reflects two independent signals: a lifecycle state (pending, active, paused, canceled, suspended, closed) and a billing state (active/inactive), combined into a single color-coded badge (e.g. "Active", "Inactive", "Paused", "Canceled", "Suspended", "Pending", "Closed").
- A detail view per subscription showing the offering, plan, pricing, next billing date, and full invoice history (invoice number, billing period, amount, paid/outstanding status).
- **Pause, resume, and cancel** actions are available where the subscription's pricing option permits them (each capability — `can_pause`, `can_resume`, `can_cancel` — is controlled by the pricing option configured in Elastic Path). Cancelling requires confirmation. Taking an action refreshes the subscription's displayed status immediately.

## Related documents

- [catalog.md](catalog.md) — selecting a subscription plan at purchase time
- [account.md](account.md) — where subscription management lives
