# ShopSmart unresolved defects

Date: 8 November 2026

## F-07 Stock has no database check constraint

| Item | Detail |
|---|---|
| Area | Database, `Product.stock` |
| Status | **UNRESOLVED** |
| Why it remains | The order route already decrements stock only when `stock >= quantity` inside one transaction. A `CHECK (stock >= 0)` cannot be represented in the current Prisma schema. Adding it only in SQL would make the next `npm run db:migrate` see drift, and `prisma migrate dev` can offer to reset the database. That risk is larger than the gap |
| Impact | A direct SQL update can set a negative stock. The checkout API cannot |
| Blocks the local release candidate | No |
| Temporary limitation | Do not update product stock with raw SQL. Use the order API, which rejects insufficient stock and rolls the order back when the conditional update does not change exactly one row |
| Next action | Add the constraint only when it can be represented without a destructive Prisma drift prompt. Do not rewrite `20260910091938_initial_schema` |

## F-06 Quantity ceiling of 20

| Item | Detail |
|---|---|
| Area | API order validation |
| Status | **NOT REPRODUCED** as an incorrect total. No code change |
| Why it remains | `orderSchema` limits each quantity, and the whole items array, to 20. That is the existing rule. Current stock is 11 or less, so the cart cap and the API cap agree for every product that can be purchased |
| Impact | None for this catalog. A future product with stock above 20 could be added to the cart up to its stock and then be rejected by the API at quantity 21 |
| Blocks the local release candidate | No |
| Temporary limitation | None. Leave the 20-unit order rule in place |
| Next action | Change the ceiling only if the project requirement changes. Do not raise it only to match a hypothetical stock value |

## Live Gemini success

| Item | Detail |
|---|---|
| Area | Product assistant provider |
| Status | **BLOCKED** for a successful live model response |
| Why it remains | During the customer journey the provider returned HTTP 503. The server logged `falling back to catalog rules (PROVIDER_ERROR 503)` and the page showed the keyboard at ₱1,850 with links to `/products/2`. A successful Google response was not available. Automated tests still cover a missing key, HTTP errors, timeout, and invalid drafts |
| Impact | Customers receive the catalog rule answer when the provider fails. They do not receive an unsupported product |
| Blocks the local release candidate | No |
| Temporary limitation | Keep using the rule-based fallback when the provider is unavailable or its draft fails validation |
| Next action | Repeat one catalog question when the provider is available. Do not put the provider key in the frontend |

## Not treated as unresolved defects

Accounts, order history, product administration, persistent cart contents, and real payment processing are outside the current starter. F-01, F-02, F-03, F-04, F-05, and F-08 were fixed and verified.
