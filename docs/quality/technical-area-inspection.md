# ShopSmart technical area inspection

Date: 8 November 2026

This inspection reviewed the current source, configuration, schema, migration, and running local API. No source file, environment file, or database row was changed. `npm run db:seed` was not run. No migration was applied. No new order was created.

The local API was already running at http://localhost:3000 and the frontend at http://localhost:5173. Rejected order requests were checked before and after the calls: product stock and the order count stayed the same (6 products, 2 existing fictional orders).

## A. Inspection summary

The project matches the documented ShopSmart shape: a React catalog and cart, an Express API, Prisma models for Product, Order, and OrderItem, and a catalog-grounded assistant that falls back to rules when Gemini is not configured.

Essential browse, search, cart, validation, stock rejection, and assistant paths behave as documented. Stored orders use `PENDING` and database prices. Secrets are not tracked in Git, and the browser bundle is not given the database URL or the Gemini key.

No critical data exposure was found in this pass. The issues that need attention are operational: `/api/health` does not check PostgreSQL, the npm migration script is the development command rather than `prisma migrate deploy`, and `npm run db:seed` deletes existing catalog and order rows.

## B. Frontend findings

Files reviewed: `frontend/src/services/api.js`, `frontend/src/pages/ProductsPage.jsx`, `frontend/src/pages/ProductDetailsPage.jsx`, `frontend/src/pages/CartPage.jsx`, `frontend/src/pages/CheckoutPage.jsx`, `frontend/src/pages/AssistantPage.jsx`, `frontend/src/components/ProductCard.jsx`, `frontend/src/context/CartContext.jsx`, `frontend/src/utils/cart.js`, and `frontend/src/utils/cart.test.js`.

### Catalog

**Verified.** Opening http://localhost:5173/ rendered six active products. Names, descriptions, categories, and prices matched the API and the database. Displayed stock was Wireless Mouse 11, Compact Mechanical Keyboard 8, USB-C Study Lamp 9, 1080p Webcam 6, Laptop Stand 9, and USB Headset 7. Category options were All, Accessories, Study, Video, and Audio. Sort options were catalog order, price low to high, and price high to low. Filtering and sorting run in the browser on the products returned by the API.

Search is sent to `GET /api/products?search=`. Case-insensitive name and description search were verified on the API (`KEYBOARD` returned the keyboard; `privacy` returned the webcam).

### Product pages

**Verified for a missing product.** `/products/99999` showed `Product could not be found.` and a link back to the catalog. Cards link to `/products/:id`. Out-of-stock cards disable Add to cart and show `Out of stock` when `stock < 1`. The current database has no inactive or zero-stock product, so those labels were not seen on a live card.

**Low.** `ProductDetailsPage` does not clear `error` or the previous product when `productId` changes. A later successful load can stay hidden behind an older error if React reuses the same page instance. The catalog does not navigate from one product URL to another without leaving the page, so this was not observed in the normal click path.

### Cart

**Verified by code and unit tests.** `npm test --workspace frontend` passed 4 tests. `addProductToCart` blocks a quantity above the stock stored on the cart line. `updateCartQuantity` rejects a quantity that is not an integer of at least 1 or that exceeds that stock. Totals are `price * quantity`. `CartProvider` keeps the cart in `useState` only. A fresh page load showed Cart (0), which matches the intended refresh behavior. This inspection did not add a line and then refresh; persistence is absent in the implementation.

The cart remembers the stock from the moment the product was added. The server still rejects a purchase if stock has since fallen.

### Checkout

**Verified by code, and by the two orders already stored.** The form requires a name, an email, and an address. HTML constraints are `minLength` 2 and 10 and `maxLength` 80 and 300. The submit payload contains `customerName`, `email`, `address`, and items of `productId` plus `quantity` only. `clearCart()` runs after `api.createOrder` resolves. The confirmation shows the customer name, order id, and `order.total`. The aside says `No actual payment will be collected.` The footer says simulated purchases only.

The confirmation does not display the `PENDING` status. The status is present on the API record.

A new successful checkout was not submitted in this inspection, so the browser confirmation was not clicked again.

### Assistant page

**Verified at the API, and by the page component.** The page posts the trimmed question, enforces 3 to 300 characters before the request, and renders `answer`, recommendation links, and source links. Empty recommendations show `No matching products are currently available.` Network failures with no HTTP status show `ShopSmart is unavailable right now. Please try again.`

This inspection did not click the assistant form again after the rate limit was reached. The API responses below are what that page renders.

### Loading and errors

The catalog sets a loading message, clears it in `finally`, and on failure shows the error plus `Make sure the backend is running.` An empty filter shows `No products match your filters.` No unhandled page crash was seen on `/` or `/products/99999`. The browser console was not captured as a separate log in this pass.

## C. API findings

### Health

**Verified while the API and database were up.** `GET /api/health` returned HTTP 200, `{ "status": "ok" }`, an `X-Request-ID`, and `Access-Control-Allow-Origin: http://localhost:5173`.

**Gap.** The handler does not query Prisma. A database outage was not simulated. From the code, the endpoint would still return `ok` if PostgreSQL were down.

### Products

**Verified.**

| Request | Result |
| --- | --- |
| `GET /api/products` | HTTP 200, 6 products, ids 1 through 6, all `active: true` |
| `GET /api/products?search=KEYBOARD` | Compact Mechanical Keyboard only |
| `GET /api/products?search=privacy` | 1080p Webcam only, matched on the description |
| `GET /api/products?search=Ultra Gaming Laptop X` | Empty product list |
| `GET /api/products/0` | HTTP 400 `INVALID_PRODUCT_ID` |
| `GET /api/products/abc` and `/products/-1` | HTTP 400 |
| `GET /api/products/99999` | `PRODUCT_NOT_FOUND` |
| `GET /api/unknown` | `ROUTE_NOT_FOUND` |

The list query filters `active: true` and orders by `id` ascending. An inactive id is indistinguishable from a missing id: both return 404. No inactive row exists, so that response was not produced from a real inactive record.

### Orders

**Verified for rejected requests. Stock and order count were unchanged.**

| Request | Result |
| --- | --- |
| Short name, invalid email, short address, empty items | `422 INVALID_ORDER` |
| Duplicate product id | `422 INVALID_ORDER`, message that each product may appear once |
| Quantity 0 | HTTP 422 |
| Quantity 99 | `422 INVALID_ORDER` because quantity must be at most 20 |
| Product 99999 | `422 PRODUCT_UNAVAILABLE` |
| Mouse quantity one above current stock, with a client `price` of 1 | `409 INSUFFICIENT_STOCK`, `Only 11 unit(s) of Wireless Mouse are available.` |

The schema does not declare a price field, so Zod removes a client price before the handler runs. The total is `Prisma.Decimal` from `product.price` times quantity. The pre-check and the `updateMany` inside `prisma.$transaction` both require enough stock. A failed conditional update throws `409 STOCK_CHANGED`. The order row is created in that same transaction, so a failed stock update does not leave an order.

A successful or concurrent purchase was not repeated, because it would insert an order and change stock. The two stored orders are consistent with that implementation:

| Order | Status | Total | Item |
| --- | ---: | ---: | --- |
| 2 | PENDING | 650.00 | Product 1, quantity 1, unit price 650.00 |
| 6 | PENDING | 900.00 | Product 3, quantity 1, unit price 900.00 |

Those unit prices match the current product prices. Order status defaults to `PENDING` in the schema and in the migration.

### Assistant

`GEMINI_API_KEY` is empty in the backend environment, so `generateRecommendation` throws `MISSING_API_KEY` and the assistant uses catalog rules. No provider key appeared in these responses.

| Question | Result |
| --- | --- |
| Keyboard under ₱2,000 | Compact Mechanical Keyboard, ₱1,850, link `/products/2` |
| Ultra Gaming Laptop X | No product. `I couldn't find an in-stock product.` |
| Product under ₱100 | No product. The ₱100 budget is stated |
| Wireless mouse | Wireless Mouse, ₱650, link `/products/1` |
| `ab` and a 301-character question | `422 INVALID_QUESTION` |

Ranking drops inactive products and stock of 0 or less. A named product that is out of stock is handled before a substitute is chosen. Retrieval still loads active rows with zero stock so that the out-of-stock sentence can be returned. There is no zero-stock row now, so that sentence was not produced by the live catalog. The unit tests cover it.

The route limit is 20 requests per minute. During this inspection the one-minute window already contained earlier assistant calls. A further burst received HTTP 429 `RATE_LIMITED` with `Too many requests, please try again later.` A clean window of exactly 20 successes was not repeated.

Generated-answer checks for unsupported prices, features, and links are implemented in `validateAssistantDraft` and covered by `backend/test/assistant.test.js`. Those tests were not re-run in this inspection. A live Gemini response was not available.

### Error handling

Malformed JSON to `POST /api/orders` returned HTTP 400 `INVALID_JSON`, `Request body must be valid JSON.`, and the same id in `X-Request-ID` and `traceId`. The parser text was not in the body.

Unexpected exceptions with no application error code are returned as `500 INTERNAL_ERROR` and a generic message. That branch was reviewed in `backend/src/app.js` and is covered by `backend/test/app.test.js`. It was not triggered against the running server.

## D. Database findings

`npx prisma migrate status` reported one migration and `Database schema is up to date!` It did not apply a migration. The datasource reported database `shopsmart` on `localhost:5432`. The password was not printed.

### Models

The Prisma schema and `20260910091938_initial_schema` agree.

| Model | Storage | Notes |
| --- | --- | --- |
| Product | `DECIMAL(10,2)` price, integer stock, `active` default true | Related to order items |
| Order | `status` default `PENDING`, `DECIMAL(10,2)` total | No user or payment fields |
| OrderItem | `DECIMAL(10,2)` unit price, quantity, order and product ids | Order delete cascades. Product delete is `RESTRICT` |

There is no database `CHECK` that stock stays at or above zero. The API transaction is what prevents a negative stock. A direct SQL update could bypass it.

Inactive products are excluded by the product queries and by order creation. Zero-stock products stay in assistant retrieval but are removed by `rankProducts`, and the order route rejects a quantity above stock. Neither case exists in the current rows (`inactive` count 0, `stock <= 0` count 0).

### Orders and safety

The two stored orders have items and totals. This inspection's rejected requests did not add an order or change stock, which matches the code path that returns before the transaction.

`backend/package.json` script `db:migrate` runs `prisma migrate dev --name initial_schema`. That is a development command. It can create or reset development state. Production deployment should use `npx prisma migrate deploy`. The deployment notes already say this. The npm script itself does not.

`backend/prisma/seed.js` deletes all order items, orders, and products, then inserts six sample products. That is the destructive command. It was not executed.

Prisma printed a warning that `package.json#prisma` is deprecated and will be removed in Prisma 7. The current Prisma 6 seed setting still works.

## E. Configuration and security findings

### Classification

| Configuration | Classification | What this inspection found |
| --- | --- | --- |
| `VITE_API_URL` | Public frontend configuration | Example value is `http://localhost:3000/api`. `api.js` uses that variable and falls back to the same URL |
| `DATABASE_URL` | Backend secret | Read only by Prisma through the backend environment. Not present in frontend example config |
| `GEMINI_API_KEY` | Backend secret | Empty, so the rule-based assistant is used. The client sends a non-empty key only in the `x-goog-api-key` header |
| `FRONTEND_URL` | Backend configuration | CORS origin. The live response allowed `http://localhost:5173` |
| `PORT` | Backend configuration | API is listening on 3000 |
| `NODE_ENV` | Backend configuration | Example file sets `development`. Application code does not branch on it |
| `GEMINI_MODEL` | Backend configuration | Example value `gemini-3.8-flash`. The model name must match a safe token pattern or the provider call is refused |
| `GEMINI_TIMEOUT_MS` | Backend configuration | Example value 8000. The server clamps the value between 1000 and 15000 |

`git ls-files` returned no path for `.env`, `backend/.env`, or `frontend/.env`. `.gitignore` ignores `.env`, `.env.local`, and `dist/`.

`backend/.env.example` contains a local development connection string. That template is not a production credential, and the password from it is not repeated here. It must not be reused outside the local classroom database.

CORS is one explicit origin, not `*`. If `FRONTEND_URL` is missing, the code falls back to `http://localhost:5173`, which would be wrong for a hosted site.

The Gemini request URL is `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. The key is not appended to that URL. Prompts are built from redacted question text and catalog fields only. Assistant responses from this pass did not contain a key.

Error responses for rejected orders include Zod field messages. Those messages are not credentials. Server logs still print the underlying exception for operators.

## F. Consolidated findings

| ID | Area | Finding | Severity | Evidence | Recommendation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | API | `/api/health` returns `ok` without checking PostgreSQL | Medium | `backend/src/app.js` health handler has no Prisma call. Live call returned `ok` while the database was up. A down database was not simulated | Make the health check run a lightweight database query and return a non-ok status when it fails | Verified |
| F-02 | Database | `npm run db:migrate` runs `prisma migrate dev`, not the production deploy command | Medium | `backend/package.json` script `db:migrate`. `prisma migrate status` shows the existing migration is already applied | Keep `migrate dev` for local authoring. Use `npx prisma migrate deploy` for any shared or production database | Verified |
| F-03 | Database | `npm run db:seed` deletes every product, order, and order item before inserting samples | High | `backend/prisma/seed.js` calls `deleteMany` on all three tables. Not executed in this inspection | Do not run it against data that must be kept. Require an explicit confirmation if a reset command remains in the project | Verified |
| F-04 | Security | A missing `FRONTEND_URL` allows only `http://localhost:5173` | Medium | `cors({ origin: process.env.FRONTEND_URL \|\| 'http://localhost:5173' })`. Live CORS header matched the local frontend | Set `FRONTEND_URL` to the hosted origin before any deployment. Do not replace this with a wildcard | Verified |
| F-05 | Frontend | Product details can keep an old error when only the product id changes | Low | `ProductDetailsPage` sets `error` in `useEffect` and returns early when `error` is set. `/products/99999` itself displayed the not-found message correctly | Clear `error` and `product` at the start of the effect | Verified |
| F-06 | API | Order quantity is capped at 20 even when stock is higher, while the cart cap is the stock on the line | Low | `orderSchema` quantity `max(20)`. Quantity 99 returned `INVALID_ORDER`. Current stocks are all 11 or less, so the cart and API agree for this catalog | Keep the cap if 20 is a business rule. Otherwise validate the quantity against stock only, and surface one consistent error | Verified |
| F-07 | Database | Stock cannot go negative through the API transaction, but the table has no check constraint | Low | Migration defines `stock INTEGER NOT NULL` with no `CHECK (stock >= 0)`. Order route uses `updateMany` where `stock >= quantity` | Add a non-negative check only in a new migration after review. Do not rewrite the existing migration | Verified |
| F-08 | Frontend | Order confirmation does not show `PENDING` | Low | `CheckoutPage` renders id and total. Stored orders 2 and 6 have status `PENDING` | Show the server status on the confirmation if reviewers need it on screen. The stored status is already correct | Verified |

Intentionally absent accounts, order history, product administration, and real payments are not listed as defects.

## G. Final assessment

### Meets the documented requirements

- Catalog load, names, descriptions, categories, prices, stock labels, category list, and price sort.
- Case-insensitive product search by name and description.
- Invalid, non-positive, and missing product ids.
- Cart math, stock cap against the stock known to the cart, and non-persistent cart state.
- Checkout payload without a client price, simulated-payment notice, and cart clear only after a successful response.
- Rejected orders leave stock and order count unchanged.
- Insufficient stock, unavailable product ids, duplicate lines, and invalid customer data.
- Stored orders use database unit prices and `PENDING`.
- Assistant length checks, catalog prices, product links, honest no-match answers, and rule-based behavior with no Gemini key.
- Request ids, generic malformed-JSON errors, and a single CORS origin.
- Schema, migration, and database are in agreement. Secrets are not tracked.

### Partially meets the requirements

- Health reports process liveness only, not database liveness.
- Stock safety is enforced in the order transaction, not by a database constraint.
- Out-of-stock and inactive purchase behavior is implemented and unit-tested, but the live catalog has no such rows, and this pass did not change rows to create them.
- Concurrent `STOCK_CHANGED` behavior is implemented in the transaction. It was not executed again, because a successful concurrent order would change stock.
- The assistant rate limit is active. An isolated count of exactly 20 was not repeated inside an empty one-minute window.
- The npm migration script is safe only for local development.

### Does not meet the requirements

No inspected essential behavior is missing or contradicted by the tests that were safe to run. The seed command and the development migration script are hazards if they are used as production steps. They are not current failures of the running application.

### Could not be verified

- Live Gemini generation, timeout, authentication failure, and malformed provider output against Google. The key is empty. **Blocked** for a live provider call. The fallback path was verified.
- `/api/health` while PostgreSQL is stopped. Not simulated, to avoid disrupting the database.
- A new successful checkout and a concurrent purchase. Not run, because they write orders and stock.
- A full browser click-through of checkout and the assistant after this pass reached the assistant rate limit.

### Recommended order of work

1. Treat F-03 as an operational control: do not seed this database.
2. F-01, so health fails when the database is unavailable.
3. F-02 and F-04, before any hosted deployment.
4. F-05, F-06, F-07, and F-08 only if a later change set is approved. They are not required to keep the current local catalog correct.

No code was changed by this inspection.
