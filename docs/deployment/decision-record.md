# Decision record: ShopSmart hosted demo architecture

| Item | Value |
| --- | --- |
| Date | 19–20 November 2026 |
| Status | Accepted and deployed |
| Owner | Sean Gabriel Santos |
| Code version | `9dd41d0` on branch `aws-deployment` |
| Site | https://shopsmart-santos.duckdns.org |
| Diagram | `docs/deployment/architecture-hosted.png` |

## Decision

ShopSmart runs on **one Amazon EC2 instance** (t3.micro, Ubuntu 24.04.5 LTS) in **ap-southeast-2 (Sydney)**:

- **Nginx** terminates HTTPS with a Let's Encrypt certificate, serves the Vite build from `/var/www/shopsmart`, rewrites client routes to `index.html`, and forwards `/api/` to Express.
- **Express** (Node.js 22) runs as the systemd service `shopsmart`, listening on `127.0.0.1:3000` only.
- **PostgreSQL 16** runs on the same instance and listens on `127.0.0.1:5432` only.
- A **DuckDNS** hostname points at a fixed **Elastic IP**, so the certificate and URL survive a stop and start.
- Only fictional customers and simulated checkout are used.

## Why this layout

- It is a short classroom demonstration. One machine means fewer services to configure, explain, pay for and remove.
- The frontend and the API share one HTTPS origin. That removes CORS mismatches and HTTP-from-HTTPS mixed-content failures, and keeps the session cookie first-party (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api`).
- Only ports 80 and 443 are public. Port 80 is used for the certificate check and then redirects to HTTPS. SSH (22) is limited to the owner's IP. Ports 3000 and 5432 are never opened in the security group, and both processes bind to localhost.

## Alternatives considered

| Option | Why not chosen |
| --- | --- |
| Amplify Hosting + EC2 API + private RDS | Clearer separation and managed database backups, but more connections to configure: a separate HTTPS API host, cross-origin cookies and CORS, and more resources drawing on credits |
| Tested local release only | Kept as the fallback in case hosting could not be approved. Not needed, because the Free plan account had credits |

## Region

The account's console project ("Big Ideas Live Here") is fixed to **ap-southeast-2 (Sydney)**; the Region could not be changed from the console. Singapore (ap-southeast-1) was the preferred Region for lower latency from the Philippines. Sydney works the same for this demo, at a similar cost and with slightly slower page loads.

## Consequences and trade-offs

- **Single point of failure.** If the instance stops, the whole site stops.
- **The team maintains the stack:** OS updates, Node.js, the systemd service, Nginx, certificate renewal (the `certbot.timer` is active) and database backups.
- **The data lives on the instance volume.** Terminating the instance deletes the database, so a `pg_dump` backup is taken before cleanup.
- **The EBS volume is not encrypted.** That is acceptable for fictional data only.
- **`npm audit` reports 17 dependency advisories.** The versions were not changed during the deployment, to keep the tested versions.

## Data decision

- The hosted database was created empty.
- Committed migrations were applied with `prisma migrate deploy`: `20260910091938_initial_schema`, `20261119144752_add_customer_accounts`, and later `add_customer_cart`.
- The database was **seeded once on 19 November 2026 while empty**, with 6 products. The seed deletes all orders, so it is never run again on the hosted database.
- Two fictional customers were created with `backend/scripts/create-customer.js`: `ana.test@example.com` and `ben.test@example.com`. Their passwords are shared privately and are not recorded here.

## Secrets

- `DATABASE_URL` uses a generated password. It lives only in `/home/ubuntu/shopsmart.env` (mode 600, outside the repository), which systemd reads through `EnvironmentFile`.
- `GEMINI_API_KEY` is left empty. The assistant uses catalog rules, and every answer is labelled with its source.
- The built frontend and the service logs were searched for `postgresql://`, `DATABASE_URL`, `GEMINI_API_KEY` and `AIza`; none were found.

## Account, access and cost

| Item | Value |
| --- | --- |
| AWS plan | Free plan. No charges while on this plan |
| Credits at deployment | US$100.00; 182 days remaining, ending 19 May 2027 |
| Expected use | About US$0.50 per day of credits (instance, 20 GiB volume, public IPv4) |
| Access | The account owner only, with MFA turned on. The console's Team page lists who has project access |
| Budget alert | Not created. The Free plan cannot charge the card, and the plan ends when credits run out |
| Demo period | From 19 November 2026 until grading |
| Removal | After grading. See `docs/deployment/resource-register.md` and the cleanup steps in the deployment guide |
