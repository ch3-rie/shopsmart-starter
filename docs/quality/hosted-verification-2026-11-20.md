# Hosted verification: 19–20 November 2026

| Item | Value |
| --- | --- |
| Site | https://shopsmart-santos.duckdns.org |
| API | https://shopsmart-santos.duckdns.org/api |
| Region / host | ap-southeast-2 (Sydney), EC2 `i-0a9a99c082c13cd59` |
| Code version | `5dd5eb0` for the first hosted checks; `9dd41d0` (saved cart, order details page, redesigned UI) for the retests |
| Tester | Sean Gabriel Santos |
| Accounts | Fictional only: `ana.test@example.com`, `ben.test@example.com` |

The expected result was written before each check was run. The API checks used `curl` against the public HTTPS address, so every request passed through DuckDNS, the Elastic IP, Nginx and Express.

| # | Check | How | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Frontend + direct route | Open `/`, `/products/2` (with refresh), `/no-such-page` | Home loads; product page reloads with no Nginx 404; unknown path shows the app's own 404 | Home loaded over HTTPS; `/products/2` showed Compact Mechanical Keyboard ₱1,850.00, 8 available; unknown path showed "404 Page not found" | Pass |
| 1b | Public reachability | Laptop on the owner's network, and a mobile phone | Site loads on both | Loaded on both | Pass |
| 2 | API connection | Browser console; `curl https://…/api/health` from the laptop | `{"status":"ok"}`; no CORS or mixed-content errors | `{"status":"ok"}`; no console errors | Pass |
| 2b | HTTP redirect | `curl -I http://shopsmart-santos.duckdns.org/` | 301 to https | `301 Moved Permanently`, `Location: https://shopsmart-santos.duckdns.org/` | Pass |
| 3 | Catalog | `GET /api/products` | 6 active products | 6 products returned from PostgreSQL | Pass |
| 4a | Guest refused | `GET /api/orders`, `GET /api/cart`, no cookie | 401 / 401 | 401 / 401 | Pass |
| 4b | Owner allowed | Ana signs in, `POST /api/orders`, `GET /api/orders/2` | 201, then 200 | Order #2 created (201, PENDING, ₱650, `customerId` 1); read back with 200 | Pass |
| 4c | Other customer denied | Ben signs in, `GET /api/orders/2`; then no cookie | 404; 401 | 404; 401 | Pass |
| 5b | Invalid / excess quantity | Ana orders quantity 0, 21, 13 | 422, 422, 409 | 422, 422, 409 | Pass |
| 5c | Session cookie | `Set-Cookie` on login | `HttpOnly; Secure; SameSite=Lax; Path=/api` | Set by Express behind Nginx with `NODE_ENV=production` and `TRUST_PROXY=1` | Pass |
| 6 | Assistant | Ask about a keyboard under ₱2,000; an unknown product | Grounded keyboard answer with source label; honest no-match | Keyboard question answered with Compact Mechanical Keyboard ₱1,850.00 and the badge "Source: ShopSmart catalog rules". "Do you sell drones?" returned a clear no-match answer with the same badge | Pass |
| 7a | Restart recovery | `sudo systemctl restart shopsmart`; then `sudo reboot` | API back within a minute; data kept | Health `ok` after restart; after reboot Ana read order #2 (200) and Ben was denied (404) | Pass |
| 7b | Logs without secrets | `journalctl -u shopsmart \| grep -iE "postgresql://\|password\|AIza"` | No match | `no secrets in logs` | Pass |
| 8a | No secrets in browser files | `grep -rlE "postgresql://\|DATABASE_URL\|GEMINI_API_KEY\|AIza" frontend/dist` | No match | `no secrets in build` | Pass |
| 8b | No secrets in repository | `git ls-files \| Select-String '\.env$'` | Nothing | Nothing | Pass |
| 8c | Credits within plan | Console Home → Cost and usage | Credits remain; no charges | Free plan, US$100.00 credits, 182 days left at deployment | Pass |
| 9 | Saved cart (improvement 3) | Ana adds items, signs out, signs in again (laptop, then phone); Ben signs in | Ana's cart restored; Ben's cart empty; cart emptied after an order | After signing out and in, Ana's cart (USB-C Study Lamp, Laptop Stand, ₱2,100.00) came back with "Your saved cart was restored" on the laptop and on a phone. Ben's account showed no orders. A guest got 401 on `/api/cart` | Pass |
| 10 | Order details page | Ana opens an order from Account; Ben opens Ana's order link | Ana sees the details; Ben sees "Order not found" | Ana opened order #1 from Account and saw its items, delivery details and status. Ben's account listed no orders, and the API returned 404 when Ben requested Ana's order #2 | Pass |

## Screenshot evidence

Folder: `docs/quality/screenshots/2026-11-20/`. Account IDs, the owner's email and the delivery address are blacked out or blurred.

| Check | Screenshots |
| --- | --- |
| Account plan and access | `a1-plan-credits.png`, `a2-billing-credits.png`, `a3-team-owner.png` |
| AWS resources | `a4-key-pair.png`, `a5-security-group.png`, `a6-instance-running.png`, `a7-volume.png`, `a8-elastic-ip.png` |
| Server setup | `b1-versions.png`, `b2-db-localhost.png`, `b4-migrations.png`, `b5-service-running.png`, `b6-no-secrets-build.png` (8a), `b7-nginx-test.png`, `b8-certificate-1.png`, `b8-certificate-2.png`, `b9-no-secrets-logs.png` (7b) |
| 1, 1b | `c1-home-https.png`, `c2-direct-route.png`, `c3-app-404.png`, `c15-phone-home.png` |
| 2, 2b | `c4-console-clean.png`, `d1-laptop-redirect-health.png` |
| 3 | `c5-cart-total.png` |
| Sign-in and checkout | `c6-signin.png`, `c7-checkout.png`, `c8-confirmation.png` (order #3 placed in the browser) |
| 4b, 4c | `d3-owner-vs-other.png` |
| 6 | `c13-assistant-keyboard.png`, `c14-assistant-no-match.png` |
| 7a | `d4-restart.png` |
| 8b | `d6-git-no-env.png` |
| 9 | `c12-cart-restored.png`, `c16-phone-cart.png` |
| 10 | `c10-order-details.png`, `c11-ben-orders-not-found.png` |
| Tests | `d5-npm-check.png` |

## Server setup evidence

- `systemctl status shopsmart`: `active (running)`, enabled at boot, listening on `127.0.0.1:3000`.
- `ss -ltnp`: PostgreSQL listening on `127.0.0.1:5432` only.
- `certbot certificates`: certificate valid until 2027-02-17. `certbot renew --dry-run` succeeded, and `certbot.timer` is scheduled.
- `prisma migrate deploy`: all committed migrations applied, with no reset.

## Notes

- The first attempt at checks 4b and 4c returned `400 INVALID_ORDER_ID`, because the placeholder `ORDER_ID` was sent literally instead of an order number. Re-run with order `2`, the checks passed. This shows the API also rejects a malformed order ID.
