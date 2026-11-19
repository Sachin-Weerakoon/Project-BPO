# Runbook: database backup and restore

- **Owner:** Suvethica (runbook, scripts), Dulieka (cluster setup), Navod (review of encryption and access)
- **Status:** v1 (Days 5-6). Follows [ADR 0002 v3](../decisions/0002-cloud-platform.md): Supabase PostgreSQL, k3s on Oracle Cloud.
- **Scripts:** [`infra/backup/`](../../infra/backup/)

## 1. Strategy

| Question | Answer |
|---|---|
| What is backed up | the PostgreSQL database on Supabase (schema `public`: our tables and data) |
| Not backed up | Redis (cache and job queue, rebuilt automatically), container images (rebuilt by CI), Kubernetes objects (in Git) |
| Why we need our own backup | **Supabase Free has no managed backups.** If we move to Supabase Pro, its daily backups become the main copy and ours the second copy |
| How | `pg_dump` (custom format) -> encrypted with **age** -> uploaded to object storage **outside** the cluster and outside Supabase |
| When | daily at **02:00 Sri Lanka time** (Kubernetes CronJob) |
| Kept for | **7 daily + 4 weekly** copies (the Sunday backup is also saved as weekly) |
| Where | Oracle Cloud Object Storage (Always Free, S3-compatible), bucket `remotebpo-backups`, private |
| Encryption key | age key pair. Public key in the CronJob. **Private key**: offline with the lead + team password manager. Never in the cluster |
| Recovery point (RPO) | up to **24 hours** of data can be lost (daily backup) |
| Recovery time (RTO) | about **1 hour** for the staging database size |
| Restore test | before staging go-live, then **monthly** (section 6) |

The private key is **not** stored in the cluster on purpose: someone who gets into the cluster can make backups but cannot read them.

## 2. Files

| File | What |
|---|---|
| `infra/backup/pg-backup.sh` | dump -> encrypt -> upload -> checksum -> retention -> heartbeat. Exits with an error if any step fails |
| `infra/backup/pg-restore-test.sh` | download -> verify checksum -> decrypt -> restore into an **empty test database** -> smoke checks |
| `infra/backup/smoke-checks.sql` | checks after a restore (tables exist, rows exist, no broken links). Update when the real schema is ready |
| `infra/backup/Dockerfile` | image for the CronJob (`postgres:17-alpine` + age + aws-cli). Runs as non-root |
| `infra/backup/cronjob.example.yaml` | example CronJob for Dulieka's `infra/k8s` |

Safety built into the scripts:
- the unencrypted dump is **never written to disk** (streamed from `pg_dump` into `age`)
- the database URL and keys are **never printed**; logs are JSON lines like the app logs
- a **sha256 checksum** is saved with every backup and checked before a restore
- the restore script refuses a database that is **not empty**, and a target that is **not localhost** unless `RESTORE_ALLOW_REMOTE=yes`

Tested on PostgreSQL 16 with a sample database (backup, restore, smoke checks, wrong key, damaged file, non-empty target).

## 3. One-time setup

### 3.1 Encryption key (DevOps + lead)

```bash
age-keygen -o remotebpo-backup.key        # prints: Public key: age1...
```

- `age1...` (public key) -> secret `BACKUP_AGE_RECIPIENT` (it is safe to share, but keep it with the other settings)
- `remotebpo-backup.key` (private key) -> team password manager **and** an offline copy with the lead. Then delete it from your laptop.
- **If the private key is lost, every backup is useless.** Check both copies exist before the first backup.

### 3.2 Bucket (Oracle Cloud Object Storage)

1. Create bucket `remotebpo-backups`: **private**, no public access, versioning off.
2. Create a **Customer Secret Key** for a user that can only write to this bucket (S3-compatible access key + secret).
3. S3 endpoint: `https://<namespace>.compat.objectstorage.<region>.oraclecloud.com`
4. Lifecycle rules (retention):
   - prefix `staging/daily/` -> delete after **8 days**
   - prefix `staging/weekly/` -> delete after **29 days**

### 3.3 Kubernetes Secret `backup-secrets` (created by the pipeline, never committed)

| Key | Value |
|---|---|
| `DATABASE_DIRECT_URL` | Supabase **direct** connection URL (not the pooler: `pg_dump` needs a session). `?sslmode=require` |
| `BACKUP_AGE_RECIPIENT` | `age1...` public key |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | bucket key from 3.2 |
| `AWS_DEFAULT_REGION` | Oracle region, e.g. `ap-mumbai-1` |
| `S3_ENDPOINT` | endpoint from 3.2 |
| `BACKUP_HEARTBEAT_URL` | healthchecks.io ping URL (section 5) |

Use a **read-only** database user for backups if the Supabase plan allows it.

### 3.4 CronJob

Apply `infra/backup/cronjob.example.yaml` (Dulieka moves it into `infra/k8s`). It runs as non-root, with a read-only filesystem, max 30 minutes, 2 retries, never two at once.

## 4. Daily checks (2 minutes)

```bash
kubectl get cronjob pg-backup -n remotebpo                 # LAST SCHEDULE should be < 24h ago
kubectl get jobs -n remotebpo -l app=pg-backup             # COMPLETIONS 1/1
kubectl logs -n remotebpo job/<job-name>                   # "backup finished", size in bytes
```

Run a backup now (for example before a risky migration):

```bash
kubectl create job -n remotebpo --from=cronjob/pg-backup pg-backup-manual-$(date +%s)
```

## 5. Alerts

| Alert | How | Severity |
|---|---|---|
| Backup job failed | CronJob Job status `Failed`; heartbeat not received | critical |
| No backup in 26 hours | **healthchecks.io** (free) check with period 1 day, grace 2 hours. The script pings it only after a successful backup | critical |
| Backup much smaller than usual | compare `bytes` in the log with the day before (manual for now) | warning |

The full alerting rules will be in `docs/alerting.md` (next PR).

## 6. Monthly restore test (30 minutes)

Do this on your laptop or a temporary pod, **never** against Supabase staging.

```bash
# 1. Empty test database
docker run -d --name restore-test -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:17-alpine
sleep 5

# 2. Settings (bucket key in your shell only, never in a file you commit)
export BACKUP_DEST=s3://remotebpo-backups/staging S3_ENDPOINT=<endpoint>
export AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> AWS_DEFAULT_REGION=<region>
export BACKUP_AGE_IDENTITY=~/remotebpo-backup.key          # from the password manager
export RESTORE_DATABASE_URL=postgresql://postgres:test@localhost:5433/postgres
export SMOKE_SQL=infra/backup/smoke-checks.sql

# 3. Restore the latest backup and run the checks
infra/backup/pg-restore-test.sh

# 4. Clean up: delete the container AND the private key copy
docker rm -f restore-test
rm ~/remotebpo-backup.key
```

Expected: row counts per table, every smoke check `PASS`, last line `restore test passed`.
Record the result in the table in section 9.

## 7. Real restore (incident)

Use only when staging data is lost or damaged. **Tell the team first.** Navod and the lead must agree.

1. **Stop writes:** `kubectl scale deployment/api -n remotebpo --replicas=0` (the HPA minimum is 2, so also `kubectl patch hpa api -n remotebpo -p '{"spec":{"minReplicas":1}}'` and scale again if it comes back).
2. **Pick the backup:** the last one **before** the problem (`aws s3 ls .../daily/`, or `weekly/` for older).
3. **Test it first:** run section 6 with that file: `pg-restore-test.sh remotebpo-<stamp>.dump.age`.
4. **Restore into Supabase:** best into a **new, empty** Supabase database/project, then point `DATABASE_URL` / `DATABASE_DIRECT_URL` at it.
   To restore into the existing one, first take a fresh backup of the damaged state, then (only with the lead's OK):
   `RESTORE_ALLOW_REMOTE=yes` and a database where `public` is empty.
5. **Start the app:** update the secrets, `kubectl scale deployment/api -n remotebpo --replicas=2`, restore the HPA minimum, check `/ready` and the smoke checks.
6. **Write it up:** what happened, which backup, how much data was lost (time between backup and incident).

## 8. If something fails

| Error in the log | Fix |
|---|---|
| `missing command: ...` | the image is wrong: rebuild from `infra/backup/Dockerfile` |
| `pg_dump or encryption failed` + `server version mismatch` | pg_dump is older than Supabase: change `postgres:17` in the Dockerfile |
| `pg_dump or encryption failed` + connection error | check `DATABASE_DIRECT_URL` (direct, not pooler), Supabase project paused (Free pauses after 1 week without activity) |
| `backup file is too small` | the database is empty or the wrong database: check the URL |
| upload error (`AccessDenied`, `NoSuchBucket`) | bucket key, region or endpoint wrong; key expired |
| `checksum does not match` | file damaged or changed: use the previous backup and report it |
| `decrypt failed` | wrong private key, or the backup was made with another public key |

## 9. Restore test log

| Date | Backup file | Tables / rows OK | Smoke checks | Time taken | By |
|---|---|---|---|---|---|
| | | | | | |
