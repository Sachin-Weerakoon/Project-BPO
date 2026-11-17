# 0002 – Cloud platform and staging architecture

Status: Proposed (v2, Day 2) – waiting for lead answers (see Open questions)
Owner: Dulieka (with Dumindu, Suvathica, Navod)

## Context
- 14-day MVP; staging must be reachable by Day 8–10 (SRS D.4).
- Two containers: `web` (Next.js) and `api` (Express), plus MongoDB and Redis.
- The lead asked for a **free** hosting option for the MVP.
- SRS D.3 asks for private DB networking, WAF and encrypted backups; a free setup cannot meet all of these.

## Options considered
| Option | Cost | Verdict |
|---|---|---|
| A. Oracle Cloud Always Free ARM VM + Docker Compose, MongoDB Atlas Free, Redis in a container | $0 | **Chosen (proposed)** |
| B. Vercel Hobby (web) + Render free (api) + Atlas Free + Upstash free | $0 | Rejected |
| C. AWS Free plan credits + ECS Fargate | $0 until credits run out | Rejected |
| D. Paid AWS ECS / managed Kubernetes | Monthly cost | Deferred until after MVP |

### Why options were rejected
- **Vercel Hobby:** Vercel's fair-use policy limits Hobby to personal, non-commercial use and counts
  work by a paid employee as commercial. A company internship project does not qualify.
- **Render free:** the API sleeps after 15 minutes idle and takes about a minute to wake: poor for demos.
- **Option B overall:** little Docker/CI/CD work, which does not match the DevOps goals of the internship.
- **AWS Free plan:** credits run out quickly on a load balancer and NAT gateway; the account closes after
  6 months or when credits run out; anyone who has had an AWS account before is not eligible.

## Decision (proposed)
Option A: one Oracle Cloud Always Free ARM VM running `web`, `api` and `redis` with Docker Compose,
behind a reverse proxy with HTTPS. MongoDB Atlas Free cluster for the database.

## Proposed staging setup
- Oracle **home region**: Mumbai, Hyderabad or Singapore. It is chosen at sign-up and cannot be
  changed, and Always Free resources only run there.
- VM: Ampere A1 (ARM). Check the current Always Free CPU/RAM limits at sign-up.
- Network: only ports 80/443 (and SSH restricted to team IPs) open in the security list.
- Reverse proxy (Caddy or Nginx) with free Let's Encrypt TLS.
- Redis: container on the private Docker network, not exposed to the internet.
- MongoDB Atlas: IP access list allows only the VM's public IP.
- Images: CI builds **linux/arm64** images with `docker buildx` (to coordinate with Dumindu).
- Secrets: `.env` on the VM only, readable by the deploy user; never in images or the repo.

## Backup and restore
Note: the lead has decided on PostgreSQL (Supabase) with a DevOps/scaling focus. This section
already reflects that; the rest of this ADR will be updated in v3.

- **What:** PostgreSQL (Supabase). Redis is not backed up (cache/queue, rebuildable).
- **How:** a scheduled job (Kubernetes CronJob) runs `pg_dump` daily, encrypts the dump
  (e.g. `age` or `gpg`) and uploads it to object storage outside the cluster.
  The encryption key is stored as a Kubernetes Secret, with an offline copy kept by the lead.
- **Retention:** 7 daily + 4 weekly copies (adjust to storage limits).
- **If Supabase Pro is used:** Supabase daily backups are primary; our dumps are a secondary copy.
- **Restore test:** restore the latest dump into a temporary Postgres container and run smoke checks
  (row counts on core tables, sample queries). Done before staging go-live, then monthly.
  Steps to be documented in `docs/runbooks/backup-restore.md`.
- **Owners:** Dulieka (setup), Suvethica (runbook), Navod (review of encryption and access).

## Accepted risks (lead to tick each before approving)
- [ ] No WAF in front of the app
- [ ] Database reachable over the internet (restricted by IP allow-list), not private networking
- [ ] No managed backups on Supabase Free; our own daily encrypted pg_dump instead (see Backup and restore)
- [ ] Single VM: no high availability or zero-downtime deploys
- [ ] Free ARM capacity may be unavailable, and Oracle may reclaim idle free instances
- [ ] Staging holds **fake/seed data only**: no real candidates or employers

## Consequences
- Dumindu: CI must build and push arm64 images.
- Suvathica: staging secret store = `.env` on the VM for the MVP (update docs/secrets.md).
- Navod: review security list rules, TLS setup and SSH access.
- Before teardown: export MongoDB data, then delete the VM and the cluster.

## Open questions for the lead
1. Will staging hold only fake data, or will real users access it?
2. Do you accept the risks listed above?
3. Who creates and owns the Oracle Cloud account (company account and card)?