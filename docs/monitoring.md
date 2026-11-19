# Monitoring plan (placeholders)

> **Database alignment:** this staging plan currently describes PostgreSQL/Supabase. The API
> implementation follows MongoDB + Mongoose per [ADR 0003](decisions/0003-mongodb-data-store.md);
> update the readiness check, local health check, and database alerts before using this plan to
> configure staging.

- **Owner:** Suvethica (DevOps)
- **Status:** v2 (Day 5). Plan for staging on **k3s (Kubernetes) on Oracle Cloud + Supabase PostgreSQL** ([ADR 0002 v3](decisions/0002-cloud-platform.md)). Items marked **later** wait for the API and the staging cluster.
- **Related:** [logging.md](logging.md)

## 1. Health endpoints (API)

| Endpoint | Checks | Response |
|---|---|---|
| `GET /health` | the process is running (no DB call) | `200 {"status":"ok"}` |
| `GET /ready` | PostgreSQL (`SELECT 1`) and Redis connections | `200 {"status":"ready"}` or `503 {"status":"not ready","checks":{"db":"down"}}` |

- No secrets, versions of libraries, or hostnames in the response. `version` (git commit short SHA) is allowed.
- Not logged at `info` (too noisy): health requests log at `debug`.

## 2. Health checks

**Staging (Kubernetes):** probes in `infra/k8s/base/api.yaml` (Dulieka):

| Probe | Endpoint | What happens when it fails |
|---|---|---|
| liveness | `/health` | Kubernetes restarts the container |
| readiness | `/ready` | the pod gets no traffic until the database and Redis are back |

- Readiness `timeoutSeconds` must stay **3s or more**: `/ready` waits up to 2s for each dependency.
- `/ready` and `/metrics` are **not** exposed through the ingress. Only `/health` is public, for the uptime check.
- `kubectl get pods -n remotebpo` shows `READY 1/1` or `0/1`. `kubectl describe pod <name>` shows failed probes.

**Local (Docker Compose):**

```yaml
services:
  api:
    healthcheck:
      # wget is in node:alpine images; for node:slim use:
      # ["CMD", "node", "-e", "fetch('http://localhost:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      test: ["CMD", "wget", "-qO-", "http://localhost:5000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 30s
  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
```

## 3. Uptime monitoring (later, staging)

- **UptimeRobot free** (or Better Stack free): check `https://<staging-domain>/health` and the web home page every 5 minutes.
- Alert to the team email / WhatsApp group when down for 2 checks in a row.

## 4. Cluster and database metrics (later)

| What | Alert when | How |
|---|---|---|
| Pod CPU / memory | > 80% of the limit for 10 min | `kubectl top pods -n remotebpo` (k3s metrics-server, also used by the autoscaler) |
| Pod restarts | > 3 restarts in 15 min (crash loop) | `kubectl get pods -n remotebpo` (`RESTARTS` column) |
| Autoscaler at max | `api` at 4 replicas for 15 min | `kubectl get hpa -n remotebpo` |
| Node CPU / memory / disk | > 80% for 10 min | `kubectl top nodes`, Oracle Cloud monitoring (free) |
| TLS certificate | < 14 days left | uptime tool certificate check, cert-manager status |
| PostgreSQL (Supabase) | connections near the plan limit, slow queries, database size near the free limit | **Supabase dashboard** (Reports, Query Performance). Server settings like `log_min_duration_statement` may not be changeable on the managed plan |

## 5. App metrics (later, after MVP)

- Requests per minute, error rate (5xx %), p95 `durationMs`: first from logs, then `/metrics` (Prometheus format, `prom-client`) if we add Grafana.
- `/metrics` must **not** be public: not in the ingress, only reachable inside the cluster.
- Later: Prometheus finds the api pods through **Kubernetes service discovery** (placeholders in `infra/monitoring/`).

## 6. Error tracking (later)

- **Sentry free** for api and web. Same "never log" rules as [logging.md](logging.md) section 4: turn off sending request bodies and cookies.

## 7. Open items

- [ ] API scaffold merged, then add `/health`, `/ready` and the request logger (Suvethica)
- [ ] Staging cluster ready, then uptime checks and alerts (Suvethica + Dulieka)
- [ ] Decide who receives alerts
