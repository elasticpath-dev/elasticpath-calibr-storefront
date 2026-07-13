# Quote Functional Document (B2B)

What the storefront supports for requesting and reviewing price quotes, as an alternative to placing an order directly. B2B-only.

## Requesting a quote

Available from the cart as an alternative to checkout, via a three-step wizard:

1. **Details** — company name, contact name, and email (required); PO reference, requested delivery date, payment terms (Net 30/60/90 or Prepay), target price, annual volume, and notes (all optional); a delivery address (required, chosen from saved addresses or entered new).
2. **Review** — every captured field plus the full item list (with quantities) is shown for confirmation, with edit links back to step 1.
3. **Confirmation** — a generated quote reference number and a status timeline (requested → reviewed → awaiting approval → shared).

Submitting creates the quote in Elastic Path, bulk-adds the cart's items to it, and clears the shopper's cart.

## Viewing quotes

From the account "Quotes" page:

- A list of every quote the account has submitted, showing reference, date, buyer contact, status, and total.
- Statuses: Draft, Pending, Active, Accepted, Rejected, Expired — each shown with a distinct badge color.
- A detail view per quote: line items (image, name, SKU, quantity, unit price, line total), buyer contact, request details (payment terms, target price, volume, notes), and the delivery address.

## Related documents

- [cart.md](cart.md) — quotes are built from the current cart
- [account.md](account.md) — where quote history lives
- [checkout.md](checkout.md) — the direct-order alternative to requesting a quote
