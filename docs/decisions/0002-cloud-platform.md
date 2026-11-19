# 0002 – Cloud platform and staging architecture

Status: Proposed (v3, Day 5) – based on the lead's decision (PostgreSQL/Supabase, DevOps & scaling focus).
Assumptions are marked and waiting for the lead's confirmation (see Open questions).
Owner: Dulieka (with Dumindu, Suvethica, Navod)

## Context
- The lead decided: **PostgreSQL on Supabase** instead of MongoDB, and a focus on **DevOps and scaling**
  ("scaling is a bigger obstacle than the build itself for production-grade apps").
- App: `web` (Next.js 15, SSR) and `api` (Express), plus Redis (BullMQ jobs, Socket.io adapter).
- Staging must be reachable by Day 8–10 (SRS D.4). Budget: free tiers unless the lead approves spending.
- SRS D.1: no hard lock-in to one cloud provider.

## Assumptions (waiting for the lead's confirmation)
- A1. Supabase is the **managed cloud** service (not self-hosted) and is used for the **database only**.
  Auth (JWT), file storage and Socket.io stay in our own code for now.
- A2. App hosting is **Kubernetes (k3s) on Oracle Cloud Always Free ARM VMs**.
- A3. Free plans for the MVP (Supabase Free, Oracle Always Free).
- A4. Accounts are created and owned by the company (the lead).

## Options considered
| Option | Cost | Verdict |
|---|---|---|
| A. k3s on Oracle Always Free VMs + Supabase Postgres + Redis in cluster | $0 | **Chosen (proposed)** |
| B. Single Oracle VM + Docker Compose (ADR v2) | $0 | Superseded: no real scaling practice |
| C. Firebase App Hosting + Cloud Run | $0 within free limits, card required | Rejected |
| D. Vercel Hobby + Render free | $0 | Rejected |
| E. AWS Free plan + ECS Fargate | $0 until credits run out | Rejected |
| F. Managed Kubernetes (EKS/GKE/OKE paid) | Monthly cost | Deferred until after MVP |

### Why options were rejected
- **Docker Compose on one VM:** simple, but no replicas, autoscaling or rolling deploys, which is the lead's focus.
- **Firebase:** SSR Next.js and the API need the Blaze plan (card on file); budget alerts do not cap
  spending; Socket.io on Cloud Run needs extra work; Google lock-in.
- **Vercel Hobby:** limited to personal, non-commercial use; a company project does not qualify.
- **Render free:** API sleeps after 15 minutes idle.
- **AWS Free plan:** credits run out quickly on load balancers/NAT; account closes after 6 months;
  not available to people who had an AWS account before.

## Decision (proposed)
Run `web`, `api` and `redis` on a **k3s** Kubernetes cluster on Oracle Always Free ARM VMs.
Database: **Supabase PostgreSQL** (managed), in the region closest to the cluster.

## Staging architecture
- **Region:** Oracle home region Mumbai, Hyderabad or Singapore (fixed at sign-up; Always Free only runs
  there). Supabase project in the closest region to it, to keep database latency low.
- **Cluster:** k3s on the Always Free ARM capacity (check current CPU/RAM limits at sign-up), e.g.
  1 server node + 1 agent node. k3s includes an ingress controller (Traefik) and metrics-server.
- **Ingress:** HTTPS only, Let's Encrypt certificates via cert-manager. Only `/` (web) and `/api` exposed;
  `/ready` and `/metrics` not exposed publicly.
- **Network:** Oracle security list allows only 80/443 publicly; Kubernetes API and SSH restricted to
  team IPs. Redis is a ClusterIP service (internal only).
- **Database access:** Supabase connection via the **connection pooler** (many API pods share a small
  number of database connections). Supabase network restrictions limited to the cluster's egress IP if
  available on our plan.
- **Images:** CI builds **linux/arm64** images with `docker buildx` and pushes to a registry
  (to agree with Dumindu: GitHub Container Registry or Oracle Container Registry).

## Scaling design
- **Stateless pods:** no sessions or uploaded files on local disk; JWT auth, files in object storage.
- **Replicas:** `api` and `web` start with 2 replicas each.
- **Autoscaling:** HorizontalPodAutoscaler on CPU (e.g. 2–4 replicas, target 70%), using k3s metrics-server.
- **Resource requests/limits** on every container so the scheduler and autoscaler work correctly.
- **Rolling deploys:** `maxUnavailable: 0`, `maxSurge: 1` → zero-downtime updates.
- **Probes:** liveness → `/health`, readiness → `/ready` (from PR #5). Readiness timeout ≥ 3s
  (the app's dependency check times out at 2s).
- **Socket.io:** Redis adapter so messages reach clients on any `api` pod; sticky sessions at the
  ingress for the WebSocket handshake.
- **BullMQ:** workers can run as a separate Deployment and scale independently from the API.
- **Load testing:** a simple load test (e.g. k6) against staging to show autoscaling works
  and check the SRS targets (p95 < 300 ms for simple APIs).

## Secrets
- Staging secrets stored as **Kubernetes Secrets**, created from the deploy pipeline (GitHub Actions
  secrets), never committed. Encryption at rest for Secrets enabled in k3s.
- New variables: `DATABASE_URL` (Supabase pooler), `SUPABASE_URL`, Supabase keys.
- `SUPABASE_SERVICE_ROLE_KEY` is **server-only**: never in a `NEXT_PUBLIC_` variable, never in the browser.
- `NODE_ENV=production` set in all manifests.

## Observability
- Logs: JSON to stdout (PR #5), collected by Kubernetes; `kubectl logs` for MVP.
- Health: probes as above; external uptime check on the public `/health`.
- Metrics (after MVP): Prometheus discovering pods via Kubernetes service discovery; `/metrics`
  internal only.

## Backup and restore
- **What:** PostgreSQL (Supabase). Redis is not backed up (cache/queue, rebuildable).
- **How:** a Kubernetes CronJob runs `pg_dump` daily, encrypts the dump (e.g. `age` or `gpg`) and
  uploads it to object storage outside the cluster. The encryption key is stored as a Kubernetes Secret,
  with an offline copy kept by the lead.
- **Retention:** 7 daily + 4 weekly copies (adjust to storage limits).
- **If Supabase Pro is used:** Supabase daily backups are primary; our dumps are a secondary copy.
- **Restore test:** restore the latest dump into a temporary Postgres container and run smoke checks
  (row counts on core tables, sample queries). Done before staging go-live, then monthly.
  Steps to be documented in `docs/runbooks/backup-restore.md`.
- **Owners:** Dulieka (setup), Suvethica (runbook), Navod (review of encryption and access).

## Accepted risks (lead to tick each before approving)
- [ ] Supabase Free pauses after 1 week of inactivity and has no managed backups (our pg_dump instead)
- [ ] No WAF in front of the app (Oracle WAF / Cloudflare free can be added later)
- [ ] Small cluster on free capacity: limited high availability; a node failure can cause downtime
- [ ] Free ARM capacity may be unavailable, and Oracle may reclaim idle free instances
- [ ] Database reachable over the internet (protected by credentials and TLS), not private networking
- [ ] Staging holds **fake/seed data only**: no real candidates or employers

## Consequences
- **Dumindu:** CI builds arm64 images, pushes to the registry, and deploys to k3s.
- **Suvethica:** secrets plan (PR #2) moves to Kubernetes Secrets and new variable names;
  monitoring placeholders move to Kubernetes service discovery.
- **Navod:** review ingress/TLS, network rules, Kubernetes Secrets, service role key handling.
- **Backend:** API must stay stateless and use the Supabase pooler connection string.
- **Dulieka:** Kubernetes manifests in `infra/k8s/` (Deployments, Services, Ingress, HPA, probes).

## Open questions for the lead
1. Supabase: managed cloud or self-hosted? Database only, or also Auth/Storage/Realtime? (A1)
2. OK with k3s on Oracle free VMs for staging? (A2)
3. Free plans, or is Supabase Pro ($25/month: no pause, daily backups) possible? (A3)
4. Who creates and owns the Oracle and Supabase accounts? (A4)
5. Do you accept the risks listed above?