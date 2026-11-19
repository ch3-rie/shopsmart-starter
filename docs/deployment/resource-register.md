# ShopSmart resource register

Owner: Sean Gabriel Santos. Account plan: AWS Free plan. Region: **ap-southeast-2 (Sydney)**. No credentials, keys or account IDs are recorded in this file.

| Service | Resource name / ID | Region | Owner | Purpose | Created | Planned removal |
| --- | --- | --- | --- | --- | --- | --- |
| EC2 key pair | `shopsmart-key` (`key-025c7b8df37cd60e8`) | ap-southeast-2 | Sean Santos | SSH login (private key kept only on the owner's laptop) | 2026-11-19 | After grading |
| EC2 security group | `shopsmart-web-sg` (`sg-06fd1f3324160c112`) | ap-southeast-2 | Sean Santos | Inbound 80 and 443 from anywhere; 22 from the owner's IP only | 2026-11-19 | After grading |
| EC2 instance | `shopsmart-demo` (`i-0a9a99c082c13cd59`), t3.micro, Ubuntu 24.04.5 LTS, ap-southeast-2b | ap-southeast-2 | Sean Santos | Nginx, Express API, PostgreSQL 16 | 2026-11-19 | After grading |
| EBS volume | `vol-06bfb3e39c081951f`, 20 GiB gp3, not encrypted | ap-southeast-2 | Sean Santos | Instance disk; holds the database | 2026-11-19 | Deleted with the instance; check Volumes afterwards |
| Elastic IP | `32.237.46.12` (`eipalloc-0ca34feed18451bbe`) | ap-southeast-2 | Sean Santos | Fixed public address for the instance | 2026-11-19 | Release after grading (it is charged until released) |
| DuckDNS hostname | `shopsmart-santos.duckdns.org` → 32.237.46.12 | n/a (external) | Sean Santos | Public name needed for HTTPS | 2026-11-19 | Delete after grading |
| TLS certificate | Let's Encrypt for `shopsmart-santos.duckdns.org`, expires 2027-02-17, auto-renew on | n/a (on instance) | Sean Santos | HTTPS | 2026-11-19 | Removed with the instance |

## Cleanup checklist (after grading)

- [ ] Take a final `pg_dump` backup and copy it to the laptop. Keep it off GitHub.
- [ ] Terminate `shopsmart-demo`, then confirm the Volumes list is empty.
- [ ] Release Elastic IP `32.237.46.12`.
- [ ] Delete security group `shopsmart-web-sg` and key pair `shopsmart-key`, then delete the local `.pem` file.
- [ ] Check Snapshots, AMIs and the other Regions for leftovers.
- [ ] Delete the DuckDNS subdomain.
- [ ] Watch the credit balance for 2 to 3 days, then record the removal dates in this file.
