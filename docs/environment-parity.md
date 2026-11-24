# Environment parity checklist (local vs CI vs staging)

- **Owner:** Suvethica (DevOps, Days 7-8). Review: Dumidu (local + CI), Dulieka (staging)
- **Status:** v1 (Day 7). Based on: Dumidu's `docker-compose.yml` and `ci.yml` (branch `feature/working_local_docker_compose`),
  Sachin's API (`test-vmain`, ADR 0003 MongoDB) and Dulieka's Kubernetes config (PR #10).
- **Why:** "works on my machine" bugs come from differences between environments. Some differences are on purpose
  (debug logs locally, TLS on staging); everything else should be the same.

Legend: ✅ same · 🟡 different on purpose · ❌ gap to fix before the first staging deploy

## 1. Runtime versions

| Item | Local | CI | Staging | Status | Action / owner |
|---|---|---|---|---|---|
| Node.js | whatever is installed (api allows `>=20`) | 22 | from the Docker image (not built yet) | ❌ | Pin **Node 22** everywhere: `"engines": {"node": "22.x"}`, `.nvmrc` with `22`, Dockerfiles `FROM node:22-alpine` (Dumidu) |
| MongoDB | `mongo:8` (Compose) | none yet | MongoDB Atlas (free cluster) | 🟡 check | Confirm the Atlas cluster version is 8.x when it is created (Dulieka) |
| Redis | `redis:7-alpine` | none yet | `redis:7-alpine` | ✅ | - |
| CPU architecture | x86 (laptops) | x86 (GitHub runner) | **ARM** (Oracle free VMs) | 🟡 | Images must be built for `linux/amd64,linux/arm64` (`docker buildx`) (Dumidu) |
| Next.js | 15 (`apps/web`) | 15 | 15 | ✅ | - |

## 2. Configuration (environment variables)

The API checks its settings at start-up (`apps/api/src/config.js`) and **refuses to start** if one is wrong.

| Variable | Local (`.env`) | Staging | Status | Action / owner |
|---|---|---|---|---|
| `NODE_ENV` | `development` | `production` | 🟡 | expected. Note: `production` also turns **off** automatic MongoDB indexes (see 4.1) |
| `LOG_LEVEL` | `info` (`.env.example`) | `info` | ✅ | use `debug` locally only when needed |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/remotebpo` (**no user/password**) | Atlas `mongodb+srv://...?maxPoolSize=10` (Secret) | ❌ | Dumidu's Compose starts MongoDB **with** a root user. With the URI in `.env.example` the API connects and `/ready` says OK, but **every query fails** ("requires authentication"). Tested on MongoDB 8. Fix: `.env.example` -> `mongodb://admin:devpassword@127.0.0.1:27017/remotebpo?authSource=admin`, and add `MONGO_USERNAME` / `MONGO_PASSWORD` (Suvethica + Dumidu) |
| `REDIS_URL` | `redis://localhost:6379` | `redis://redis:6379` (ConfigMap) | ✅ | - |
| `CORS_ORIGIN` | `http://localhost:3000` | `https://staging.example.com` (placeholder) | ❌ | set the real staging domain when known (Dulieka) |
| `METRICS_ENABLED` | not set (= `false`) | `false` | ✅ | - |
| `API_PORT` | `5000` | `5000` | ✅ | - |
| `APP_URL` | in `.env.example` | not set | 🟡 | not used by the API yet. Remove from `.env.example` or add it to the ConfigMap when email links need it (Sachin) |
| `GIT_SHA` | not set | not set | ❌ | CI should pass the commit SHA into the image so `/health` shows the version (Dumidu) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | build argument | ❌ | must be set **at image build time** for staging: `https://<domain>/api` (Dumidu) |
| `JWT_*`, `SMTP_*`, `S3_*` | in `.env.example` | not in `api-secrets` yet | 🟡 | not used by the API yet. Add to `api-secrets` when auth/email/uploads are merged ([secrets.md](secrets.md)) |

## 3. Services and networking

| Item | Local | Staging | Status | Action / owner |
|---|---|---|---|---|
| API and web | run with `npm run dev` (not in Compose) | containers in Kubernetes | 🟡 | fine for development. Add `api`/`web` to Compose later (profile `full`, plan Days 5-6) so the full stack can be tested like staging (Dumidu) |
| Web server mode | `next dev` | standalone server (expected by `web.yaml`) | ❌ | `apps/web/next.config.ts` has no `output: "standalone"`. Add it, or the Dockerfile must run `next start` (Dumidu + frontend) |
| Public `/health` | `http://localhost:5000/health` | `https://<domain>/health` goes to the **web** app (ingress sends `/` to web) | ❌ | add an ingress rule `/health` (Exact) -> `api:5000`, so the uptime check really tests the API (Dulieka). Until then, monitor `https://<domain>/api/v1` |
| `/metrics`, `/ready` | open on localhost | not in the ingress | ✅ | keep them internal |
| Ports open on the machine | MongoDB `27017` and Redis `6379` published on **all** network interfaces | internal to the cluster | ❌ | local: publish as `127.0.0.1:27017:27017` and `127.0.0.1:6379:6379`, so Redis (no password) is not reachable from the Wi-Fi network (Dumidu) |
| TLS (https) | no | yes (cert-manager, when the domain is known) | 🟡 | expected |
| Mock API (WireMock stubs) | yes (`:8081`) | no | 🟡 | local only, for frontend work before the real API |

## 4. Data

| Item | Local | Staging | Status | Action / owner |
|---|---|---|---|---|
| 4.1 Indexes | created automatically (`autoIndex` on) | **not** created (`autoIndex` off when `NODE_ENV=production`) | ❌ | add a deploy step that runs `Model.syncIndexes()` (or `createIndexes`) once per release, before traffic. Otherwise unique email / no-duplicate-application rules do not exist on staging (Sachin + Dumidu) |
| Test data | seed script, fake data ([seed-data.md](seed-data.md)) | same seed script, fake data | ✅ | never real personal data |
| Redis data | kept after restart (`appendonly yes`, volume) | **lost** on restart (`emptyDir`) | 🟡 | OK while Redis is only a cache. If job queues (BullMQ) are added, decide if jobs may be lost on restart (Sachin + Dulieka) |
| Backups | none (local data is disposable) | daily backup job | ❌ | backup scripts are still `pg_dump` (PostgreSQL). Update to **`mongodump`** for MongoDB, Atlas free has no backups of its own (Suvethica) |
| Time zone | laptop time zone | UTC | 🟡 | the app stores and logs **UTC** only; convert in the UI |

## 5. Logging and monitoring

| Item | Local | Staging | Status | Action / owner |
|---|---|---|---|---|
| Log format | JSON lines (pino), same fields | same | ✅ | [logging.md](logging.md) |
| Where logs are read | terminal | `kubectl logs` only, lost when a pod is deleted | ❌ | centralized logs (Suvethica, Day 8) |
| Health checks | `/health`, `/ready` | liveness `/health`, readiness `/ready` | ✅ | - |
| Uptime alerts | - | UptimeRobot on `/health` | ❌ | depends on the `/health` ingress rule above |

## 6. CI (GitHub Actions)

| Item | Now (`ci.yml`) | Needed | Status | Action / owner |
|---|---|---|---|---|
| Where `npm ci` runs | repo root | the repo has **no root `package.json`**: run in `apps/web` and `apps/api` (`working-directory`) | ❌ | Dumidu |
| Branches | `main`, `develop` | there is no `develop` branch | 🟡 | remove `develop` or create it (team decision) |
| Next.js build on Linux | - | `apps/web/package-lock.json` misses the Linux build package (`@next/swc-linux-x64-gnu`), so `npm ci` + `npm run build` can fail on Linux | ❌ | regenerate the lock file on Linux/WSL (`rm -rf node_modules package-lock.json && npm install`), or add the package as an optional dependency (frontend + Dumidu). Seen when testing PR #15 |
| API tests | not run | `npm test` in `apps/api` (logging + seed tests) | ❌ | Dumidu |
| Secret scan | separate workflow (gitleaks) | keep | ✅ | - |

## 7. Before the first staging deploy (sign-off)

- [ ] Node 22 pinned (engines, `.nvmrc`, Dockerfiles)
- [ ] Images built for amd64 + arm64, tagged with the commit SHA, `GIT_SHA` set
- [ ] `NEXT_PUBLIC_API_URL` set at web build time
- [ ] `output: "standalone"` (or `next start`) matches `web.yaml`
- [ ] `api-secrets` created by the pipeline with `MONGODB_URI` ([secrets.md](secrets.md))
- [ ] Atlas: cluster version 8.x, Network Access allows only the cluster's outgoing IP
- [ ] Indexes created by the deploy step (`syncIndexes`)
- [ ] Ingress: `/health` -> api, real domain, TLS
- [ ] `CORS_ORIGIN` = real staging domain
- [ ] Seed data loaded (fake only), `/ready` returns 200
- [ ] Backup job updated for MongoDB and one restore test done

Update this checklist whenever a new service, variable or environment is added.
