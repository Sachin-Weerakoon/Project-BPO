# Monitoring plan (placeholders)

- **Owner:** Suvethica (DevOps)
- **Status:** v1 (Day 3). Plan for staging on one Oracle VM with Docker Compose ([ADR 0002 v2](decisions/0002-cloud-platform.md)). Items marked **later** wait for the API and staging VM.
- **Related:** [logging.md](logging.md)

## 1. Health endpoints (API)

| Endpoint | Checks | Response |
|---|---|---|
| `GET /health` | the process is running (no DB call) | `200 {"status":"ok"}` |
| `GET /ready` | MongoDB and Redis connections | `200 {"status":"ready"}` or `503 {"status":"not ready","checks":{"mongo":"down"}}` |

- No secrets, versions of libraries, or hostnames in the response. `version` (git commit short SHA) is allowed.
- Not logged at `info` (too noisy): health requests log at `debug`.

## 2. Docker health checks

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped
  web:
    restart: unless-stopped
  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
```

`docker compose ps` shows `healthy` / `unhealthy`.

## 3. Uptime monitoring (later, staging)

- **UptimeRobot free** (or Better Stack free): check `https://<staging-domain>/health` and the web home page every 5 minutes.
- Alert to the team email / WhatsApp group when down for 2 checks in a row.

## 4. Server metrics (later)

| What | Alert when | How |
|---|---|---|
| CPU | > 80% for 10 min | Oracle Cloud monitoring (free) |
| Memory | > 85% | Oracle Cloud monitoring / `docker stats` |
| Disk | > 80% | Oracle Cloud monitoring (logs + images fill disks) |
| TLS certificate | < 14 days left | uptime tool certificate check |
| MongoDB Atlas | storage > 400 MB of 512 MB, connections | Atlas free alerts |

## 5. App metrics (later, after MVP)

- Requests per minute, error rate (5xx %), p95 `durationMs`: first from logs, then `/metrics` (Prometheus format, `prom-client`) if we add Grafana.
- `/metrics` must **not** be public (only from the VM / internal network).

## 6. Error tracking (later)

- **Sentry free** for api and web. Same "never log" rules as [logging.md](logging.md) section 4: turn off sending request bodies and cookies.

## 7. Open items

- [ ] API scaffold merged, then add `/health`, `/ready` and the request logger (Suvethica)
- [ ] Staging VM ready, then uptime checks and alerts (Suvethica + Dulieka)
- [ ] Decide who receives alerts
