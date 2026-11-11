# ShopSmart release notes

## Version and date

| Item | Value |
| --- | --- |
| Project | ShopSmart |
| Version | 1.0.0 |
| Date | 12 November 2026 |
| Git commit | `2570001d9fb5591ed0910b7f6bff01d4635150ff` on `main` (`Added product assistant`) |
| Submitted tree | That commit, plus uncommitted local changes. Those changes include the assistant matching fix, checkout and product-page corrections, tests, and these quality and deployment documents. They were not discarded. No project ZIP was created for this note |
| Release type | Local release candidate |

## Working features

These customer journeys were verified on the local application. The case-by-case record is `docs/quality/test-record.md`. The 12 November smoke test is `docs/quality/release-verification-2026-11-12.md`.

- **Browse and search.** The storefront loads six active products from `GET /api/products`. Cards show the name, description, category, database price, and stock. Search for `keyboard` returns the Compact Mechanical Keyboard. An unknown name shows `No products match your filters.`
- **Cart.** Adding the Wireless Mouse and setting the quantity to 2 produced Cart (2) and a total of ₱1,300. A quantity above the stock known to the line is rejected and the total stays unchanged. Refreshing the page clears the cart.
- **Simulated checkout.** On 12 November, Carmen Flores, `carmen@example.com`, and 88 Sample Street, Angeles City bought two mice. `POST /api/orders` returned HTTP 201. Order #12 is `PENDING`, total ₱1,300.00, unit price 650 from the database. The cart became Cart (0) after success. The page says no payment is collected.
- **Stock.** Mouse stock changed from 7 to 5 for that order. Orders #2 and #6 through #11 stayed `PENDING`. The other five stock values stayed unchanged. An earlier order for 11 mice was refused with HTTP 409 `INSUFFICIENT_STOCK` and did not change stock.
- **Assistant.** `Which keyboard is below ₱2,000?` answered with the Compact Mechanical Keyboard at ₱1,850 and opened `/products/2`, which showed ₱1,850.00 and 6 units. Gemini returned HTTP 503. The API logged `falling back to catalog rules (PROVIDER_ERROR 503)` and still returned HTTP 200. An unknown product name returns an honest no-match.
- **Health and recovery.** `GET /api/health` returned HTTP 200 `{"status":"ok"}`. When browser calls to the API were blocked, the catalog and assistant showed an error and then recovered after the block was removed.

`npm run check` on 12 November 2026 exited 0: frontend lint, backend lint, 4 frontend tests, 34 backend tests, and the Vite build.

## Known limitations

| Area | Limitation |
| --- | --- |
| Authentication | Not implemented. There is no login, account, or role check. Any visitor can browse, use the cart, check out, and ask the assistant. Orders are not tied to an account |
| AI | The Gemini client is integrated and the key stays on the API. This candidate did not capture a successful live model reply. The 12 November question received provider HTTP 503 and used the catalog rules. A short word such as `key` is no longer matched inside `keyboard` |
| Stock | Checkout rejects a quantity above the stored stock. The order quantity maximum remains 20. `Product.stock` has no database check that stock is at least 0, so a direct SQL update could store a negative value |
| Hosting | No private staging site and no approved live site. The candidate runs on this machine only |
| Cart and payment | The cart is browser memory and clears on refresh. Checkout does not collect payment, and stored orders stay `PENDING`. There is no order-history page |

## Local startup

Follow `README.md` from the ShopSmart-Starter root. This candidate was run with Node.js v24.11.1 and PostgreSQL 18 on port 5432. The README already covers install, `backend/.env`, `frontend/.env`, `npm install`, `npm run db:generate`, `npm run db:migrate`, and `npm run dev`.

Extra configuration on this candidate:

- `backend/.env` also sets `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_TIMEOUT_MS`. Those values stay on the API. They are not `VITE_` variables and were not copied into this note. `backend/.env.example` leaves `GEMINI_API_KEY` empty.
- `frontend/.env` sets `VITE_API_URL` to the public local API, `http://localhost:3000/api`.
- Local schema changes use `npm run db:migrate` (`prisma migrate dev`). A shared database uses `npm run db:migrate:deploy` (`prisma migrate deploy`).
- `npm run db:seed` runs only when `SHOPSMART_ALLOW_SEED=yes`, and then it deletes products, orders, and order items. Do not seed a database whose orders must be kept. This verification did not seed.

After startup, open http://localhost:5173, http://localhost:3000/api/health, and http://localhost:3000/api/products. Run `npm run check` before treating a copy as a candidate.

## Deployment status

**Local release candidate.** Private staging was not approved, and there is no live site.

The 12 November 2026 smoke test passed with documented limitations. Health, the six-product catalog, the cart total, fictional order #12, and the assistant catalog fallback all passed. `npm run check` passed. The decision is recorded in `docs/quality/release-verification-2026-11-12.md` as ready with documented limitations. The diagram in `docs/deployment/architecture.png` is a plan, not a completed host.

## Team record

The repository has no roster that assigns a test, a contribution, and an issue to each person. Git commits are authored by the handle `rierie` (Sean Gabriel Santos). Names are not filled in from that handle. Each member should complete one row.

| Team member | Test performed | Contribution | Issue explained |
| --- | --- | --- | --- |
| | | | |
| | | | |
| | | | |

The verified work, not yet assigned to a person, is the customer journeys in `docs/quality/test-record.md`, the 12 November release check in `docs/quality/release-verification-2026-11-12.md`, and the fixes in `docs/quality/fix-and-verification-2026-11-11.md`.
