# ShopSmart fix and verification report

Date: 8 November 2026

Each implemented change is the smallest correction for a confirmed inspection finding. No test expectation was weakened. The database was not seeded, reset, or truncated.

| Defect ID | Fix Implemented | Files Changed | Test Executed | Verification Result |
|---|---|---|---|---|
| F-01 | `/api/health` runs `SELECT 1`. Success stays HTTP 200 `{ "status": "ok" }`. Failure is HTTP 503 `{ "status": "unavailable" }`. The handler logs `database health check failed` and does not return the driver error | `backend/src/app.js`, `backend/test/app.test.js` | `health reports ok only after the database answers`; `health stays generic when the database check fails` | **FIXED AND VERIFIED.** The failure test threw a connection string and the response contained neither that string nor `postgresql://`. The live API returned HTTP 200 `{ "status": "ok" }` while PostgreSQL was up. PostgreSQL was not stopped |
| F-02 | `npm run db:migrate` remains `prisma migrate dev` for local authoring. `npm run db:migrate:deploy` runs `prisma migrate deploy` | `package.json`, `backend/package.json`, `README.md`, `docs/RELEASE_NOTES.md`, `docs/deployment/deployment-plan.md`, `backend/test/seed-guard.test.js` | `local migration authoring and production deployment stay separate commands`; `npm run db:migrate:deploy` | **FIXED AND VERIFIED.** Deploy reported `No pending migrations to apply` for database `shopsmart` on `localhost:5432`. It did not add or remove orders |
| F-03 | `prisma/seed.js` exits with code 1 before creating a Prisma client unless `SHOPSMART_ALLOW_SEED` is `yes` | `backend/prisma/seed.js`, `backend/test/seed-guard.test.js`, `README.md`, `docs/RELEASE_NOTES.md`, `docs/deployment/deployment-plan.md` | `seed refuses to delete data unless confirmation is explicit` | **FIXED AND VERIFIED.** The test process exited 1, its error text said `Refusing to seed`, and the order and product counts were unchanged. The deleting path was not run |
| F-04 | `resolveCorsOrigin` keeps the local default. `NODE_ENV=production` with no origin throws. `*` throws. The live local origin is unchanged | `backend/src/app.js`, `backend/test/app.test.js`, `docs/deployment/deployment-plan.md` | `cors allows the local frontend and rejects a missing production origin or a wildcard` | **FIXED AND VERIFIED** for the function. A hosted production process was not started |
| F-05 | The product effect clears `error` and `product` when the id changes, and it ignores a response that arrives after the id changes again | `frontend/src/pages/ProductDetailsPage.jsx` | Browser: `/products/99999`, then a same-page change to `/products/1` | **FIXED AND VERIFIED.** The page showed Wireless Mouse, ₱650.00, and `11 unit(s) available` |
| F-06 | No code change | None | Schema and current stock reviewed. Quantity 99 was already rejected in the inspection | **NOT REPRODUCED** as a customer-facing failure. The 1-to-20 ceiling stays |
| F-07 | No migration | None | Schema and `orders.js` transaction reviewed | **UNRESOLVED.** A check constraint was not added because Prisma cannot model it without risking a later development reset |
| F-08 | The confirmation renders `order.status` between the order number and the server total | `frontend/src/pages/CheckoutPage.jsx` | Browser checkout of two keyboards | **FIXED AND VERIFIED.** Order **#7** showed `Status: PENDING` and `Total: ₱3,700.00` |

## Why these fixes address the causes

F-01 failed closed only in the process sense. The new query makes a database outage visible, and the catch block avoids copying a Prisma error into the response.

F-02 was a missing command, not a wrong local workflow. `db:migrate` still creates development migrations. `db:migrate:deploy` only applies migrations that are already committed.

F-03 deleted rows by default. The process now stops before `deleteMany` unless the operator sets `SHOPSMART_ALLOW_SEED=yes` for that command. The classroom setup steps in the README include that variable.

F-04 left a hosted API on the classroom origin whenever the variable was forgotten, and it did not reject `*`. Local requests with `FRONTEND_URL` unset still allow `http://localhost:5173`.

F-05 kept the first failed render in front of a later successful product because `error` was never cleared. Clearing both pieces of state shows the loading message, then the product that belongs to the current id.

F-08 stored `PENDING` correctly and hid it. The page now prints the status field from the order response.

## Customer journey after the fixes

Starting catalog stock was mouse 11, keyboard 8, lamp 9, webcam 6, stand 9, and headset 7.

1. The catalog at http://localhost:5173/ showed those six products, prices, and stock labels.
2. Search `keyboard` left only Compact Mechanical Keyboard at ₱1,850.00.
3. `/products/2` showed the keyboard description and `8 unit(s) available`.
4. Add to cart changed the header to Cart (1).
5. Quantity 2 produced Items 2 and Total ₱3,700. A quantity of 9 kept quantity 2 and showed `Only 8 unit(s) are available.`
6. Checkout showed Total ₱3,700 and `No actual payment will be collected.` The cart still showed Cart (2).
7. The submitted body was `customerName`, `email`, `address`, and `items: [{ productId: 2, quantity: 2 }]`. It did not include a price.
8. The confirmation was order **#7**, status **PENDING**, total **₱3,700.00**. The header became Cart (0) only after that response.
9. The database row is `PENDING`, total 3700, product 2, quantity 2, unit price 1850. Keyboard stock is 6.
10. The assistant question `What keyboard can I buy under ₱2,000?` answered that the Compact Mechanical Keyboard is available for ₱1,850. Both links point to `/products/2`. The API log recorded `falling back to catalog rules (PROVIDER_ERROR 503)`.

## Failure checks

| Check | Result |
|---|---|
| Invalid name, email, address, and empty items | HTTP 422 `INVALID_ORDER`. No order was created |
| Keyboard quantity 20, above stock 8, with a client `price` of 1 | HTTP 409 `INSUFFICIENT_STOCK`, `Only 8 unit(s) of Compact Mechanical Keyboard are available.` Stock stayed 8 until the later successful checkout |
| Product 99999 | HTTP 422 `PRODUCT_UNAVAILABLE` |
| Lamp quantity 1 with client `price` 1, fictional customer Luis Garcia | HTTP 201, order **#8**, status `PENDING`, total 900, stored unit price 900. Lamp stock changed from 9 to 8 |
| Health while the database was up | HTTP 200 `{ "status": "ok" }` |
| Health while the database check throws | Covered by the automated test: HTTP 503 `{ "status": "unavailable" }` with no connection text |
| Assistant provider HTTP 503 | The page showed the catalog rule answer, not an invented product |

Orders now present: #2 total 650, #6 total 900, #7 total 3700, and #8 total 900. All are `PENDING`. Final stock: mouse 11, keyboard 6, lamp 8, webcam 6, stand 9, headset 7.

`npm run db:seed` was not run with confirmation. `npm run db:migrate:deploy` applied nothing.
