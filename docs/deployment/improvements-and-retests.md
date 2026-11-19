# Improvements and retests

Each improvement was first tested locally (`npm run check` and browser checks), then retested on the hosted site at https://shopsmart-santos.duckdns.org. Detailed results are in `docs/quality/hosted-verification-2026-11-20.md`.

| # | Improvement | Problem before | Change | Retest on hosted site | Expected | Result | Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Customer sign-in and server-side order ownership | No accounts. Any visitor could place orders, and nothing protected order records | Session sign-in: scrypt password hashes, and a random session token in an `HttpOnly` `Secure` cookie (only its SHA-256 hash is stored). `requireCustomer` guards every order route, and ownership is part of the database query. Checkout requires sign-in | Checks 4a, 4b, 4c, 5b, 5c | Guest 401; owner 201/200; other customer 404; invalid quantities 422/409 | All passed, including after a reboot (`d3`) | `5dd5eb0` |
| 2 | Assistant answer-source label | A catalog-rules fallback looked the same as a live AI answer | The API returns `answerSource` (`ai_provider` or `catalog_rules`), and the page shows it as a coloured badge | Check 6 | Every answer shows its source; the fallback stays correct | Passed (`c13`, `c14`) | `5dd5eb0` |
| 3 | Saved cart per customer | The cart lived only in the browser tab, so it was lost on refresh, on sign-out, or on another device | New `CartItem` table and migration; `GET`/`PUT /api/cart` (sign-in required). Price and stock always come from the catalog. The cart is restored and merged at sign-in, and emptied when an order is placed | Check 9 | Cart restored after sign-in, also on a phone; another customer cannot see it; guest 401 | Passed (`c12`, `c16`; guest 401 on `/api/cart`) | `9dd41d0` |

## Related changes (same release)

- **Order details page** (`/account/orders/:id`). It reads the order through the owner-checked API, so another customer sees "Order not found" (check 10).
- **Redesigned sign-in, assistant, cart, checkout and confirmation pages.** They have a progress bar, a clearer order summary, and a printable receipt.
- **Cart cleared on sign-out.** This was a defect found during testing: the cart remained visible after sign-out on a shared computer. It was fixed and retested.
- **Deployment hardening:** `TRUST_PROXY=1` so rate limits see the real visitor behind Nginx, `HOST=127.0.0.1`, and the systemd service file and Nginx config committed in `deploy/`.

## Automated tests

- Test files: `backend/test/auth.test.js` (passwords, cookie options, guests refused on order and cart routes), `backend/test/cart.test.js` (cart validation, catalog prices, stock caps) and `frontend/src/utils/cartMerge.test.js` (merging a guest cart into the saved cart).
- At `5dd5eb0`, `npm run check` passed with 39 backend tests and 4 frontend tests, plus lint and build.
- At `9dd41d0`, `npm run check` passed (`d5-npm-check.png`): lint passed, and the frontend ran 8 tests in 2 files, all passing. The backend summary (`ℹ tests`, `ℹ pass`, `ℹ fail 0`) is in `d5-npm-check-2.png`.
