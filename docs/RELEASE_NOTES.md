# ShopSmart release notes

## Version 1.1.0: hosted release (20 November 2026)

| Item | Value |
| --- | --- |
| Release type | **Hosted on AWS** (not local) |
| Site URL | https://shopsmart-santos.duckdns.org |
| Code version | `9dd41d0` on branch `aws-deployment` (first hosted build `5dd5eb0`) |
| AWS plan | Free plan; US$100.00 credits and 182 days remaining at deployment (plan ends 19 May 2027). No card charges on this plan |
| Region | ap-southeast-2 (Sydney). The console project is fixed to this Region |
| Services | EC2 t3.micro (Ubuntu 24.04.5 LTS), EBS gp3 20 GiB, Elastic IP. On the instance: Nginx, Node.js 22, PostgreSQL 16, Let's Encrypt certificate (valid until 17 February 2027, renews automatically). DuckDNS for the hostname |
| Architecture | Single EC2 host, same-origin frontend and API. See `docs/deployment/decision-record.md` and `docs/deployment/architecture-hosted.png` |
| AI provider | No live provider. `GEMINI_API_KEY` is empty, so answers come from the catalog rules and are labelled as such in the page |
| Resources | `docs/deployment/resource-register.md` |
| Removal | After grading |

### New in this release

- **Customer sign-in and order ownership.** Fictional accounts are created with `backend/scripts/create-customer.js`. Checkout requires sign-in. `GET /api/orders` and `GET /api/orders/:id` return only the signed-in customer's own orders. Another customer gets 404, and a guest gets 401.
- **Saved cart per customer.** `GET`/`PUT /api/cart` save the cart. It is restored at sign-in, on any device, and emptied when an order is placed. Prices and stock always come from the catalog.
- **Order details page** at `/account/orders/:id`, with a printable receipt.
- **Assistant answer-source label:** "AI provider draft" or "ShopSmart catalog rules".
- **Redesigned pages:** sign-in, account, assistant, cart, checkout and order confirmation.
- **Deployment files** in `deploy/` (Nginx site, systemd service, environment template without secrets).

### Tested URLs

`/`, `/products/2`, `/no-such-page`, `/cart`, `/checkout`, `/account`, `/account/orders/:id`, `/assistant`, `/api/health`, `/api/products`, `/api/auth/login`, `/api/auth/me`, `/api/orders`, `/api/orders/:id`, `/api/cart`, and `http://` to `https://` redirect.

The results are in `docs/quality/hosted-verification-2026-11-20.md`, and the improvement retests are in `docs/deployment/improvements-and-retests.md`.

### Known limitations

| Area | Limitation |
| --- | --- |
| Hosting | A single EC2 instance is a single point of failure. The database lives on the instance volume, and backups are manual (`pg_dump`) |
| Accounts | No public sign-up and no password reset. Fictional accounts are created by script |
| Cart | Saved for signed-in customers only. A guest's cart stays in the browser tab until sign-in |
| Orders | Orders stay `PENDING`. There is no payment, fulfilment or cancellation |
| AI | No live provider key. Answers come from the catalog rules and are labelled |
| Storage | The EBS volume is not encrypted, which is acceptable for fictional data only |
| Dependencies | `npm audit` reports 17 advisories. The versions were not changed during the deployment, to keep the tested versions |
| Region | Sydney rather than Singapore, so latency from the Philippines is slightly higher |

## Version 1.0.0: local release candidate (12 November 2026)

### Version and date

| Item | Value |
| --- | --- |
| Project | ShopSmart |
| Version | 1.0.0 |
| Date | 12 November 2026 |
| Git commit | `2570001d9fb5591ed0910b7f6bff01d4635150ff` on `main` (`Added product assistant`) |
| Submitted tree | That commit, plus uncommitted local changes. Those changes include the assistant matching fix, checkout and product-page corrections, tests, and these quality and deployment documents. They were not discarded. No project ZIP was created for this note |
| Release type | Local release candidate |

### Working features

These customer journeys were verified on the local application. The case-by-case record is `docs/quality/test-record.md`. The 12 November smoke test is `docs/quality/release-verification-2026-11-12.md`.

- **Browse and search.** The storefront loads six active products from `GET /api/products`. Cards show the name, description, category, database price, and stock. Search for `keyboard` returns the Compact Mechanical Keyboard. An unknown name shows `No products match your filters.`
- **Cart.** Adding the Wireless Mouse and setting the quantity to 2 produced Cart (2) and a total of ₱1,300. A quantity above the stock known to the line is rejected and the total stays unchanged. Refreshing the page clears the cart.
- **Simulated checkout.** On 12 November, Carmen Flores, `carmen@example.com`, and 88 Sample Street, Angeles City bought two mice. `POST /api/orders` returned HTTP 201. Order #12 is `PENDING`, total ₱1,300.00, unit price 650 from the database. The cart became Cart (0) after success. The page says no payment is collected.
- **Stock.** Mouse stock changed from 7 to 5 for that order. Orders #2 and #6 through #11 stayed `PENDING`. The other five stock values stayed unchanged. An earlier order for 11 mice was refused with HTTP 409 `INSUFFICIENT_STOCK` and did not change stock.
- **Assistant.** `Which keyboard is below ₱2,000?` answered with the Compact Mechanical Keyboard at ₱1,850 and opened `/products/2`, which showed ₱1,850.00 and 6 units. Gemini returned HTTP 503. The API logged `falling back to catalog rules (PROVIDER_ERROR 503)` and still returned HTTP 200. An unknown product name returns an honest no-match.
- **Health and recovery.** `GET /api/health` returned HTTP 200 `{"status":"ok"}`. When browser calls to the API were blocked, the catalog and assistant showed an error and then recovered after the block was removed.

`npm run check` on 12 November 2026 exited 0: frontend lint, backend lint, 4 frontend tests, 34 backend tests, and the Vite build.

### Known limitations

| Area | Limitation |
| --- | --- |
| Authentication | Not implemented. There is no login, account, or role check. Any visitor can browse, use the cart, check out, and ask the assistant. Orders are not tied to an account |
| AI | The Gemini client is integrated and the key stays on the API. This candidate did not capture a successful live model reply. The 12 November question received provider HTTP 503 and used the catalog rules. A short word such as `key` is no longer matched inside `keyboard` |
| Stock | Checkout rejects a quantity above the stored stock. The order quantity maximum remains 20. `Product.stock` has no database check that stock is at least 0, so a direct SQL update could store a negative value |
| Hosting | No private staging site and no approved live site. The candidate runs on this machine only |
| Cart and payment | The cart is browser memory and clears on refresh. Checkout does not collect payment, and stored orders stay `PENDING`. There is no order-history page |

### Local startup

Follow `README.md` from the ShopSmart-Starter root. This candidate was run with Node.js v24.11.1 and PostgreSQL 18 on port 5432. The README already covers install, `backend/.env`, `frontend/.env`, `npm install`, `npm run db:generate`, `npm run db:migrate`, and `npm run dev`.

Extra configuration on this candidate:

- `backend/.env` also sets `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_TIMEOUT_MS`. Those values stay on the API. They are not `VITE_` variables and were not copied into this note. `backend/.env.example` leaves `GEMINI_API_KEY` empty.
- `frontend/.env` sets `VITE_API_URL` to the public local API, `http://localhost:3000/api`.
- Local schema changes use `npm run db:migrate` (`prisma migrate dev`). A shared database uses `npm run db:migrate:deploy` (`prisma migrate deploy`).
- `npm run db:seed` runs only when `SHOPSMART_ALLOW_SEED=yes`, and then it deletes products, orders, and order items. Do not seed a database whose orders must be kept. This verification did not seed.

After startup, open http://localhost:5173, http://localhost:3000/api/health, and http://localhost:3000/api/products. Run `npm run check` before treating a copy as a candidate.

### Deployment status

**Local release candidate.** Private staging was not approved, and there is no live site.

The 12 November 2026 smoke test passed with documented limitations. Health, the six-product catalog, the cart total, fictional order #12, and the assistant catalog fallback all passed. `npm run check` passed. The decision is recorded in `docs/quality/release-verification-2026-11-12.md` as ready with documented limitations. The diagram in `docs/deployment/architecture.png` is a plan, not a completed host.

The verified work, not yet assigned to a person, is the customer journeys in `docs/quality/test-record.md`, the 12 November release check in `docs/quality/release-verification-2026-11-12.md`, and the fixes in `docs/quality/fix-and-verification-2026-11-11.md`.
