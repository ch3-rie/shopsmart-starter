# ShopSmart deployment plan

Date: 8 November 2026  
Status: local release candidate. Live staging was not performed because approved hosting and database access were unavailable.

Diagram: `docs/deployment/architecture.png`

## 1. Deployment overview

ShopSmart is a classroom store. A local release candidate is required. A public deployment is not part of this release.

The running local candidate is:

| Part | Address |
| --- | --- |
| Browser application | http://localhost:5173 |
| Express API | http://localhost:3000 |
| Health check | http://localhost:3000/api/health |
| PostgreSQL | localhost:5432, database name `shopsmart` |

No hosting URL is claimed. The production shape below is the plan to use when an instructor approves a host and a database.

## 2. Architecture description

```text
Customer browser
  → HTTPS
  → Hosted React + Vite frontend
  → HTTPS API requests
  → Express backend
  → PostgreSQL
```

When `GEMINI_API_KEY` is set, the Express process may also send a server-side request to Google Gemini. The browser never opens a connection to PostgreSQL or Gemini. Product prices, stock changes, and assistant facts are produced by the API.

The frontend calls only the base URL in `VITE_API_URL`, through `frontend/src/services/api.js`.

## 3. Frontend deployment

The production frontend is the static output of:

```powershell
npm run build
```

That command runs Vite in `frontend` and writes `frontend/dist`. The host should serve `frontend/dist` as a static site and return `index.html` for client routes such as `/products/1`, `/cart`, `/checkout`, and `/assistant`.

The frontend reads `VITE_API_URL` when Vite builds the bundle. For this local candidate the value is `http://localhost:3000/api`. For a hosted site, set it to the public API base, including the `/api` suffix, before running the build. Example shape:

```text
VITE_API_URL=https://<approved-api-host>/api
```

`VITE_API_URL` is public configuration. Vite inlines it into the browser bundle, so it must not contain a database password, a Gemini key, or any other secret. Anyone can see the API address by using the site. That is expected. The API address is not an access credential.

## 4. Backend deployment

The API process is the Express application started with:

```powershell
npm run start --workspace backend
```

That runs `node src/server.js`. The development command `npm run dev` uses `node --watch` and is for local work, not for production.

The process listens on `PORT`. Locally that is `3000`. The public health URL would be:

```text
https://<approved-api-host>/api/health
```

Expected body when PostgreSQL answers: `{ "status": "ok" }`. If the database check fails, the response is HTTP 503 and `{ "status": "unavailable" }`, with no connection details.

`FRONTEND_URL` is the exact browser origin allowed by CORS in `backend/src/app.js`:

```javascript
cors({ origin: resolveCorsOrigin() })
```

Locally, a missing `FRONTEND_URL` still allows `http://localhost:5173`. In production the variable is required, and `*` is rejected. Set it to the hosted frontend origin, for example `https://<approved-frontend-host>`. A mismatch produces browser CORS failures.

## 5. Database deployment

PostgreSQL 16 or newer is required. This machine is running PostgreSQL 18, which satisfies that requirement.

The API receives the connection string only through `DATABASE_URL` in the backend environment. Prisma reads it from `backend/.env` locally and from the process environment in production. The password stays in that private variable. It is not prefixed with `VITE_`, not imported by the frontend, and not printed in these documents.

Connectivity is verified by starting the API and requesting `/api/health`, then requesting `/api/products`. A failed health check returns HTTP 503 and `{ "status": "unavailable" }`. Other failed database operations still return a generic `500 INTERNAL_ERROR` and a trace ID. Neither response includes the connection string.

## 6. Environment configuration

| Variable | Where | Classification | Local value used |
| --- | --- | --- | --- |
| `VITE_API_URL` | Frontend build | Public | `http://localhost:3000/api` |
| `DATABASE_URL` | Backend only | Secret | Present in `backend/.env`. Not copied here |
| `PORT` | Backend | Configuration | `3000` |
| `FRONTEND_URL` | Backend | Configuration | `http://localhost:5173` |
| `NODE_ENV` | Backend | Configuration | `development` locally. Use `production` on a host |
| `GEMINI_API_KEY` | Backend only | Secret | Empty in this environment |
| `GEMINI_MODEL` | Backend | Configuration | `gemini-3.8-flash` in the example file |
| `GEMINI_TIMEOUT_MS` | Backend | Configuration | `8000`, clamped by the server between 1000 and 15000 |

Do not put `DATABASE_URL` or `GEMINI_API_KEY` in frontend environment variables. Do not commit `.env` or `.env.local`. The repository `.gitignore` already ignores them. `git ls-files` showed no tracked `.env` file. The example files `backend/.env.example` and `frontend/.env.example` are templates.

## 7. CORS configuration

The browser origin must equal `FRONTEND_URL`. Local verification sent `Origin: http://localhost:5173` and the API responded with `Access-Control-Allow-Origin: http://localhost:5173`.

Production setup:

1. Deploy the API on its HTTPS host.
2. Set `FRONTEND_URL` to the HTTPS origin of the static site, without a path.
3. Rebuild the frontend with `VITE_API_URL` pointing at `https://<api-host>/api`.
4. From the hosted page, confirm a product request succeeds and the browser console shows no CORS error.

## 8. Database migration strategy

Committed migrations live in `backend/prisma/migrations`. The current migration is `20260910091938_initial_schema`, which creates `Product`, `Order`, and `OrderItem`.

Apply committed migrations to a production database with:

```powershell
npm run db:migrate:deploy
```

That runs `prisma migrate deploy` from `backend`, with `DATABASE_URL` set to the production database, before the API serves traffic.

Do not use `npx prisma migrate dev` as the production step. `migrate dev` is the local workflow behind `npm run db:migrate`, and it can create new migrations.

`npm run db:seed` now exits before deleting rows unless `SHOPSMART_ALLOW_SEED=yes`. Do not set that confirmation against a database that already holds records to keep. With the confirmation, the seed deletes products, orders, and order items before inserting the six sample products.

## 9. Security and privacy considerations

- Staging, if it is created later, should be private to the class until the instructor approves public access. This release has no staging site.
- Access can be restricted by the host's private network, authentication in front of the host, or by sharing the address only with the class. The application itself has no user accounts.
- Checkout is simulated. Use fictional names, emails, and addresses. Do not enter real customer information.
- There is no payment integration. Do not connect a payment provider.
- Secrets stay in the backend environment. The production frontend build was searched for `DATABASE_URL`, `postgresql://`, `GEMINI_API_KEY`, and `AIza`. None were present.
- Provider requests, when a key exists, send the key in the `x-goog-api-key` header and not in the URL. The assistant redacts email addresses and Philippine mobile numbers before building a prompt. Those protections are covered by the existing automated tests.
- Order responses include the customer fields that the same browser just submitted. There is no order-list endpoint.

## 10. Deployment verification procedure

After a future approved deployment, in order:

1. Confirm `GET https://<api-host>/api/health` returns `{ "status": "ok" }`.
2. Confirm `GET https://<api-host>/api/products` returns active products.
3. Open the hosted frontend and confirm the catalog loads from the API, not from a stale local bundle.
4. Search for `keyboard`.
5. Add a product, change the quantity, and check the total.
6. Place one simulated order with fictional details. Confirm HTTP 201, status `PENDING`, and a total that matches the database price.
7. Ask the assistant for a keyboard under ₱2,000 and for a product name that is not in the catalog.
8. Confirm the browser network log shows no request to PostgreSQL or to `generativelanguage.googleapis.com`.

This procedure was executed against localhost. It was not executed against a hosted environment.

## 11. Deployment limitations

- No live site and no hosted database were approved, so none was created.
- `NODE_ENV` remains `development` for the local process.
- The local cart is cleared on refresh.
- Orders stay `PENDING`.
- Gemini remains optional and is off until a server-side key is supplied.
- The local PostgreSQL identity sequence is ahead of the two remaining fictional orders because controlled stock probes created and then deleted intermediate rows. That does not affect totals or stock.
