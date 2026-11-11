# ShopSmart defect report

Date: 8 November 2026

This pass started from `docs/quality/technical-area-inspection.md`. Defects D-1 through D-4 from the earlier quality pass stay fixed. They were not reopened. The rows below are the inspection findings reviewed in this pass.

| Defect ID | Area | Severity | Reproduction Status | Actual Result | Expected Result | Root Cause |
|---|---|---|---|---|---|---|
| F-01 | API | Medium | Reproduced | `GET /api/health` returned HTTP 200 and `{ "status": "ok" }` without querying PostgreSQL | A healthy check queries the database. A failed check returns a non-ok status and no connection details | `backend/src/app.js` answered before any Prisma call |
| F-02 | Database | Medium | Reproduced | `npm run db:migrate` ran `prisma migrate dev --name initial_schema`. There was no project command for `prisma migrate deploy` | Keep local migration authoring, and provide a separate command that only applies committed migrations | The production command existed only in documentation |
| F-03 | Database | High | Reproduced in code. The deleting path was not executed | `backend/prisma/seed.js` called `deleteMany` on order items, orders, and products as soon as it started | The command must refuse unless the operator explicitly confirms a disposable database | Nothing checked for confirmation before the deletes |
| F-04 | Security | Medium | Reproduced in code | A missing `FRONTEND_URL` always allowed `http://localhost:5173`. The value `*` was accepted by the fallback expression | Local development may use that origin. Production must name one origin, and a wildcard must be rejected | CORS used `process.env.FRONTEND_URL \|\| 'http://localhost:5173'` |
| F-05 | Frontend | Low | Reproduced | On `/products/99999` the page showed `Product could not be found.` A same-page move to `/products/1` requested `/api/products/1` and still showed the old error | The new product replaces the previous error | `ProductDetailsPage` stored `error` and returned early without clearing it when `productId` changed |
| F-06 | API | Low | Reproduced as validation, not as a wrong charge | Quantity 99 is rejected with `422 INVALID_ORDER` because the schema maximum is 20. Every current stock value is 11 or less | Keep the existing 1-to-20 quantity rule | `orderSchema` sets `quantity` to `min(1).max(20)`, the same ceiling used for the items array. This is the written order rule, not an incorrect total |
| F-07 | Database | Low | Reproduced by schema review | `Product.stock` is `INTEGER NOT NULL` with no `CHECK (stock >= 0)`. The order transaction already refuses a decrement below available stock | A table constraint would also reject a direct SQL change | Prisma's schema cannot represent this check. A SQL-only constraint would look like drift to the next `prisma migrate dev`, which can offer a database reset |
| F-08 | Frontend | Low | Reproduced in code, then on the new confirmation | The confirmation showed the order id and total. Stored orders were already `PENDING` | The confirmation shows the status returned by the server | `CheckoutPage` did not render `order.status` |

## Reproduction notes

| Defect ID | Starting state | Action | Reproduction status |
|---|---|---|---|
| F-01 | API and PostgreSQL were running | Read `GET /api/health` and the handler in `backend/src/app.js` | Reproduced. The body was `{ "status": "ok" }` and the handler did not call Prisma |
| F-02 | One migration already applied | Read `backend/package.json` and ran the new deploy command later, after it existed | Reproduced. The only migrate script was `prisma migrate dev` |
| F-03 | Orders #2 and #6 and six products were present | Read `backend/prisma/seed.js`. The seed was not run | Reproduced from source. A live delete was not performed |
| F-04 | `FRONTEND_URL` is set for this local API | Read the CORS setup. The live header remained `http://localhost:5173` | Reproduced from source. Production was not hosted, so the missing-variable startup failure could not be observed on a live host |
| F-05 | Product 99999 is absent. Product 1 is the Wireless Mouse, stock 11 | Opened `/products/99999`, then changed the address to `/products/1` without a full reload | Reproduced. The URL and the product request changed, and the page still said `Product could not be found.` |
| F-06 | Prior inspection sent quantity 99 | Compared `backend/src/validators/schemas.js` with current stock | The rejection is the schema rule. No catalog row can be ordered above 20 today |
| F-07 | Migration `20260910091938_initial_schema` | Compared the SQL with `schema.prisma` and the order transaction | Reproduced. No negative stock exists, and no constraint was added |
| F-08 | Orders #2 and #6 were `PENDING` | Read `CheckoutPage` before the change | Reproduced. The page rendered id and total only |

## Earlier defects that remain corrected

D-1 and D-2: an unknown product and a budget with no match no longer recommend a loosely related catalog item. D-3: malformed JSON returns `400 INVALID_JSON` and a request id. D-4: the assistant rate limit uses the `RATE_LIMITED` error envelope. Those tests are still in the suite and passed again with `npm run check`.
