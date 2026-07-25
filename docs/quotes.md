# Quotes (B2B)

What the storefront supports for requesting and reviewing price quotes, as an
alternative to placing an order directly. B2B-oriented.

- **Request route:** `/{lang}/quote-request` (entered from the cart)
- **Account routes:** `/{lang}/account/quotes` (list) · `/{lang}/account/quotes/{quoteId}` (detail)
- **Primary source files:** `src/components/quote/QuoteRequestFlow.tsx`,
  `src/components/account/tabs/QuotesTab.tsx`, `src/components/account/QuoteDetail.tsx`,
  `src/lib/api/quotes.ts` (hand-rolled `/v2/quotes` client)

> Requires being signed in. No env flags gate quotes.

---

## Capabilities

### Requesting a quote
Available from the cart as an alternative to checkout, via a three-step wizard:
1. **Details** — company name, contact name and email (required); PO reference, requested delivery date, payment terms (Net 30/60/90 or Prepay), target price, annual volume and notes (optional); a delivery address (required — saved or new).
2. **Review** — every captured field plus the full item list (with quantities), with edit links back to step 1.
3. **Confirmation** — a generated quote reference and a status timeline (requested → reviewed → awaiting approval → shared).

Submitting creates the quote in Elastic Path, bulk-adds the cart's items to it, and clears the shopper's cart.

### Viewing quotes
From the account **Quotes** page:
- A list of every quote the account has submitted — reference, date, buyer contact, status, total. (No pagination on quotes.)
- **Statuses:** Draft, Pending, Active, Accepted, Rejected, Expired — each with a distinct badge colour.
- A **detail** view per quote: line items (image, name, SKU, quantity, unit price, line total), buyer contact, request details (payment terms, target price, volume, notes) and the delivery address.

> The quote detail is **view-only** — there are no accept/reject or convert-to-order actions in this view.

---

## Behaviour scenarios (BDD)

```gherkin
Feature: Request a quote

  Scenario: Three-step wizard
    Given I am a signed-in shopper with items in the cart
    When I choose "Request quote" and complete Details → Review
    Then a quote is created, the cart items are added to it, and my cart is cleared
    And I see a confirmation with a generated reference

  Scenario: Details validation
    Then company name, contact name, email and a delivery address are required
    And PO reference, delivery date, payment terms, target price, volume and notes are optional
```

```gherkin
Feature: Review quotes

  Scenario: Quote list
    Then my quotes list with ID, Date, Buyer, Status and Total (each links to detail)

  Scenario Outline: Status badges
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
    Then I see its line items, contact, request details and delivery address
    And there are no accept/reject or convert actions
```

---

**Related:** [cart.md](cart.md) · [account.md](account.md) · [checkout.md](checkout.md)
