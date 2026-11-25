# Logging standard

- **Owner:** Suvethica (DevOps)
- **Status:** v1 (Day 3). Applies to `apps/api` (and any future backend service).
- **Related:** [secrets.md](secrets.md) (what must never be logged), [monitoring.md](monitoring.md)

## 1. Format

- Logs are **JSON, one object per line**, written to **stdout** (Docker collects them; no log files inside containers).
- Library: **pino** (fast JSON logger) + **pino-http** for request logs. Pretty printing (`pino-pretty`) only in local dev.
- Times in **UTC, ISO 8601**.

## 2. Fields

Every log line has:

| Field | Example | Notes |
|---|---|---|
| `time` | `2026-11-16T17:05:12.345Z` | UTC |
| `level` | `info` | see section 3 |
| `service` | `api` | which app wrote it |
| `env` | `staging` | from `NODE_ENV` |
| `msg` | `request completed` | short, fixed text (no values inside) |

Request logs also have:

| Field | Example | Notes |
|---|---|---|
| `requestId` | `5f1c…` | from the `X-Request-Id` header, or a new UUID. Sent back in the response header |
| `method` | `POST` | |
| `path` | `/api/v1/candidates` | route path only, **no query string** |
| `status` | `201` | |
| `durationMs` | `42` | |
| `userId` | `3f6c…` (UUID) | only the ID, never name or email. Empty if not logged in |
| `role` | `recruiter` | |

Errors also have `err.type`, `err.message` and `err.stack` (stack **not** in production responses, only in logs).

Example:

```json
{"time":"2026-11-16T17:05:12.345Z","level":"info","service":"api","env":"staging","msg":"request completed","requestId":"5f1c2a9e-1b7d-4c1e-9a43-0c2d1e7f9b10","method":"POST","path":"/api/v1/candidates","status":201,"durationMs":42,"userId":"3f6c9b2e-8a1d-4f57-b0c4-2e9d7a51c8f3","role":"recruiter"}
```

## 3. Levels

Set with `LOG_LEVEL` (default `info`).

| Level | When |
|---|---|
| `error` | something failed and needs a fix (5xx, DB down, unhandled error) |
| `warn` | something odd but handled (4xx spikes, failed login, retry, slow request > 1s) |
| `info` | normal events: request completed, server started, job finished |
| `debug` | details for developers. **Off** in staging and production |

| Environment | `LOG_LEVEL` |
|---|---|
| local | `debug` |
| staging | `info` |
| production | `info` |

## 4. Never log

- Passwords, password hashes, OTPs, reset tokens
- JWTs, cookies, `Authorization` headers, API keys, any value from `.env`
- Full request or response **bodies**
- Personal data: names, emails, phone numbers, addresses, NIC/ID numbers, CV contents, salary
- `MONGODB_URI`, `DATABASE_URL` or any other connection string
- Database query **values** (they can hold personal data). Log the collection or table name, not the values

pino `redact` must cover at least:

```js
redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]',
         '*.password', '*.token', '*.accessToken', '*.refreshToken', '*.email', '*.phone']
```

Log **IDs**, not people: `candidateId: "3f6c…"`, not the candidate's name.

## 5. Where logs go

| Environment | Where | Kept for |
|---|---|---|
| local | terminal (pretty), or `docker compose logs` | - |
| staging (k3s) | stored on the node by Kubernetes and rotated by the kubelet (default 10 MB x 5 files per container) | about 50 MB per container, lost when the pod is deleted |

Read logs on staging:

```bash
kubectl logs -n remotebpo -l app=api --tail=100 -f            # all api pods
kubectl logs -n remotebpo deploy/api --previous                 # the container before a crash/restart
kubectl logs -n remotebpo -l app=api --tail=-1 | grep <requestId>
```

Local Docker Compose (optional rotation):

```yaml
services:
  api:
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "5" }
```

Pod logs are deleted with the pod, so staging also sends every log line to **Grafana Cloud Logs** (Loki), kept 14 days and searchable by `level`, `requestId`, `status` and `durationMs`. Setup and example searches: [runbooks/centralized-logs.md](runbooks/centralized-logs.md).

## 6. Checklist for a PR that adds logs

- [ ] Uses the shared logger (no `console.log` in `apps/api/src`)
- [ ] Right level
- [ ] No secrets or personal data (section 4)
- [ ] `msg` is fixed text; values are separate fields
