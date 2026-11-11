# ShopSmart release verification — 12 November 2026

Local release candidate. No hosted environment was approved, so staging was not exercised.

## A. Release candidate

| Item | Value |
| --- | --- |
| Project | ShopSmart 1.0.0 |
| Verification time | 12 November 2026, 00:31–00:40 (UTC+8) |
| Candidate | Local |
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| Frontend API setting | `VITE_API_URL` is set. The production bundle contains `http://localhost:3000/api` |
| Database | PostgreSQL database `shopsmart`, schema `public`, at `localhost:5432`. The password is not recorded |
| Git branch | `main` |
| Git commit | `2570001d9fb5591ed0910b7f6bff01d4635150ff` (`Added product assistant`) |
| Working tree | Quality notes, deployment notes, and earlier fixes are uncommitted. They were not discarded |

`npm run dev` was already running. A second copy was not started. `npx prisma migrate status` reported one migration and `Database schema is up to date!` It did not apply a migration. `npm run db:seed` was not run.

## B. Build and tests

`npm run check` from `C:\ShopSmart-Starter`. Exit code 0. Elapsed about 28 seconds.

| Check | Command | Actual result | Status |
| --- | --- | --- | --- |
| Frontend lint | `eslint .` | No findings | PASS |
| Backend lint | `eslint .` | No findings | PASS |
| Frontend tests | `vitest run` | `src/utils/cart.test.js`: 4 passed | PASS |
| Backend tests | `node --test` | 34 passed, 0 failed | PASS |
| Production build | `vite build` | Vite 7.3.6 wrote `frontend/dist/assets/index-BcvfYfWg.css` and `frontend/dist/assets/index-BAUtdohV.js` | PASS |
| Complete check | `npm run check` | Exit code 0 | PASS |

Backend tests: `assistant.test.js` 24, `app.test.js` 5, `validation.test.js` 3, `seed-guard.test.js` 2.

The log printed a JSON parse error for `{bad` and an error containing `secret-do-not-leak`. Those lines come from the passing tests `malformed JSON returns a generic client error and a request id` and `an unexpected server failure stays generic and keeps the trace id`. Prisma also printed its existing warning that `package.json#prisma` is deprecated. Neither failed the check.

## C. Smoke test

| Test | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| Health | `{ "status": "ok" }` | `GET /api/health` returned HTTP 200, body `{"status":"ok"}`, `X-Request-ID: cbf7ed2d-c0af-4e85-b1bf-34a6c6a54ecb`. `Access-Control-Allow-Origin` was `http://localhost:5173` | PASS |
| Products | Active products load in the API and the storefront | `GET /api/products` returned HTTP 200 and 6 active products. The home page showed the same names, prices, and stock | PASS |
| Cart | Quantity and total follow the catalog price | Cart (0) to Cart (1) after adding Wireless Mouse. Quantity 2 produced Cart (2), line ₱1,300, and total ₱1,300 | PASS |
| Simulated checkout | Fictional order is stored and the cart clears | Confirmation showed order #12, `PENDING`, total ₱1,300.00, for Carmen Flores. Cart (0) after success. The form says no actual payment is collected. `POST /api/orders` returned HTTP 201 | PASS |
| Database | New order uses the database price and does not reset prior data | Order #12 is `PENDING`, total 1300, product 1, quantity 2, unit price 650. Mouse stock changed from 7 to 5. Orders #2, #6, #7, #8, #9, #10, and #11 remain `PENDING` with the same totals. The other five stock values are unchanged. All six products remain active | PASS |
| Assistant | Answer uses a current catalog product | Question: `Which keyboard is below ₱2,000?` Answer: `I found a keyboard within your ₱2,000 budget. Compact Mechanical Keyboard is currently available for ₱1,850.` The link opened `/products/2`, which showed ₱1,850.00 and 6 units | PASS |
| Assistant outage | A provider failure still returns a controlled catalog result | The API logged `falling back to catalog rules (PROVIDER_ERROR 503)` and returned HTTP 200 in 4408 ms. The page showed the catalog answer and no provider key. Automated tests passed for a missing key, HTTP errors, timeout, and malformed provider output | PASS |

Products before checkout:

| ID | Product | Price | Stock |
| --- | --- | ---: | ---: |
| 1 | Wireless Mouse | ₱650.00 | 7 |
| 2 | Compact Mechanical Keyboard | ₱1,850.00 | 6 |
| 3 | USB-C Study Lamp | ₱900.00 | 8 |
| 4 | 1080p Webcam | ₱1,450.00 | 6 |
| 5 | Laptop Stand | ₱1,200.00 | 9 |
| 6 | USB Headset | ₱1,350.00 | 7 |

Checkout used fictional details only: Carmen Flores, `carmen@example.com`, 88 Sample Street, Angeles City. Submitted shape: customer name, email, address, and items `[{ "productId": 1, "quantity": 2 }]`. The stored unit price is the database price, 650.

## D. Secrets and privacy

| Check | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| Environment files | No `.env` committed | `git ls-files` returned `backend/.env.example` and `frontend/.env.example` only. `.gitignore` ignores `.env` and `.env.local` | PASS |
| Database URL | Backend only | `DATABASE_URL` is set in `backend/.env`. It is not in frontend source. Search of `frontend/dist` found no `DATABASE_URL` and no `postgresql://` | PASS |
| Provider key | Backend only | `GEMINI_API_KEY` is set in `backend/.env`. The value was not read or recorded. `backend/.env.example` leaves it empty. Search of `frontend/dist` found no `GEMINI_API_KEY`, `AIza`, or `x-goog-api-key` | PASS |
| Frontend bundle | Public API URL only | `frontend/dist/assets/index-BAUtdohV.js` contains `http://localhost:3000/api` | PASS |
| Demonstration data | Fictional customer only | Carmen Flores, `carmen@example.com`, 88 Sample Street, Angeles City | PASS |
| Screenshots | No credentials | The saved images show the storefront, cart, fictional checkout, confirmation, assistant answer, and keyboard page. They do not show a connection string or provider key | PASS |

`README.md`, `backend/.env.example`, and `backend/test/assistant.test.js` still contain the starter's local classroom connection string. That string was already in the project. It is not the private `.env` credential, and it is not repeated here.

## E. Staging

**Live staging verification: Not performed.**

No approved hosted frontend, API, or database was available. No external host was created or changed. The local candidate was verified on the URLs above. When a private staging environment is approved, repeat this smoke test on its actual URLs and record the date, URL, and result.

## F. Remaining limitations

| Issue | Impact | Blocks this local candidate | Temporary limitation |
| --- | --- | --- | --- |
| Live Gemini reply | This run received HTTP 503 from the provider. The catalog rules answered with the current keyboard price and link | No | Keep using the catalog fallback when the provider fails. Retry one catalog question when Gemini is available. Keep the key on the server |
| F-07: no `CHECK (stock >= 0)` | A direct SQL update could store a negative stock. Checkout still rejects insufficient stock inside its transaction | No | Do not change stock with raw SQL |
| F-06: quantity maximum is 20 | No current product has stock above 9, so this smoke test did not reach that ceiling | No | Keep the existing rule |
| Classroom connection string in tracked README, example, and test | A local template password is in Git. The private `.env` is not tracked | No | Do not reuse that password outside the classroom database |
| No hosted environment | There is no staging URL | No | Local use only until a host and database are approved |

## G. Decision

**READY WITH DOCUMENTED LIMITATIONS**

`npm run check` passed: frontend lint, backend lint, 4 frontend tests, 34 backend tests, and the Vite build. Health returned `ok`. The storefront matched the six active products. The cart total for two mice was ₱1,300. Fictional order #12 was stored at the database unit price, mouse stock moved from 7 to 5, and orders #2 through #11 were left in place. The assistant recommended the in-stock keyboard at ₱1,850 after the provider returned 503, and the page did not show a key.

No staging deployment is claimed.

## Evidence

- `docs/quality/screenshots/2026-11-12/release-home.png`
- `docs/quality/screenshots/2026-11-12/release-cart.png`
- `docs/quality/screenshots/2026-11-12/release-checkout.png`
- `docs/quality/screenshots/2026-11-12/release-order.png`
- `docs/quality/screenshots/2026-11-12/release-assistant.png`
- `docs/quality/screenshots/2026-11-12/release-keyboard.png`
