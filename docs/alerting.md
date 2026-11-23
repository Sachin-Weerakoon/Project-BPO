# Alerting rules (draft)

- **Owner:** Suvethica (DevOps). Review: Dulieka (cluster), Navod (security alerts)
- **Status:** v1 draft (Day 6). For staging on k3s ([ADR 0002 v3](decisions/0002-cloud-platform.md)) with **MongoDB Atlas** (ADR 0003). Final alerts: Days 11-12.
- **Related:** [monitoring.md](monitoring.md), [logging.md](logging.md), [backup runbook](runbooks/backup-restore.md)

## 1. Principles

1. Alert on **what users feel** (site down, errors, slow) and on **data safety** (backups), not on every metric.
2. Every alert has an **owner** and a **first action**. An alert nobody acts on is deleted.
3. Two levels only:

| Severity | Meaning | Who and when |
|---|---|---|
| **critical** | users are affected now, or data is at risk | DevOps on duty, **as soon as seen** (also outside working hours during demo week) |
| **warning** | something is getting worse, no user impact yet | DevOps, **next working day** |

4. Wait before firing (the `for` time) so a short spike does not wake anyone.
5. Staging has **fake data only**, so no alert ever contains real personal data. Alerts show IDs and numbers, never emails or tokens.

## 2. Where alerts go

| Tool (free) | Checks | Sends to |
|---|---|---|
| **UptimeRobot** | public `https://<staging-domain>/health` and the home page, every 5 min, TLS expiry | team email + WhatsApp group (via email or mobile app) |
| **healthchecks.io** | backup heartbeat (and later other CronJobs) | team email |
| **MongoDB Atlas** | project alerts (connections, storage, host down) | Atlas project owner email (the lead) -> forward to the group |
| **kubectl** (manual, daily) | pods, restarts, autoscaler, jobs | - (daily check, section 5) |
| **Prometheus** (after MVP) | rules in `infra/monitoring/alert-rules.yml` | later: Alertmanager -> email |

Until Prometheus exists, cluster alerts are **checked by hand** once a day (section 5).

## 3. Alert rules

### Availability

| Alert | Condition | For | Severity | First action |
|---|---|---|---|---|
| `SiteDown` | `/health` not 200 from UptimeRobot | 2 checks (10 min) | critical | `kubectl get pods -n remotebpo`, ingress, node status |
| `WebDown` | home page not 200 | 2 checks | critical | `kubectl logs -n remotebpo -l app=web --tail=100` |
| `ApiNotReady` | an api pod `READY 0/1` (`/ready` fails: MongoDB or Redis down) | 5 min | critical | `kubectl describe pod`, Atlas status and Network Access (cluster IP allowed?), Redis pod |
| `CrashLoop` | a pod restarted > 3 times in 15 min | 15 min | critical | `kubectl logs <pod> --previous` |
| `TlsExpiresSoon` | certificate expires in < 14 days | - | warning | check cert-manager `kubectl get certificate -A` |

### Errors and speed (from logs now, Prometheus later)

| Alert | Condition | For | Severity | First action |
|---|---|---|---|---|
| `HighErrorRate` | > 5% of API requests return 5xx | 5 min | critical | `kubectl logs ... \| grep '"level":"error"'`, use `requestId` to follow one request |
| `SlowApi` | p95 `durationMs` > 300 ms (SRS D.1) | 10 min | warning | Atlas Performance Advisor / slow queries, check that queries use indexes |
| `LoginFailuresSpike` | > 50 failed logins in 5 min (all users) | 5 min | warning | possible brute force: tell Navod, check rate limiting |

### Capacity

| Alert | Condition | For | Severity | First action |
|---|---|---|---|---|
| `AutoscalerAtMax` | `api` HPA at 4/4 replicas | 15 min | warning | `kubectl top pods`, check for a slow query or a traffic spike |
| `PodNearMemoryLimit` | pod memory > 85% of its limit | 10 min | warning | memory leak? compare with the last deploy |
| `NodeDiskFull` | node disk > 80% | 10 min | warning | old images: `sudo k3s crictl rmi --prune` |
| `DatabaseNearFreeLimit` | Atlas storage > 80% of the free cluster (512 MB) | - | warning | remove test/seed data (`seed --reset`), check unused indexes, ask the lead about a paid tier |
| `DatabaseConnections` | Atlas connections > 80% of the free limit (500) | 10 min | warning | check `maxPoolSize` in `MONGODB_URI` x number of api pods, look for connection leaks |

### Data safety

| Alert | Condition | For | Severity | First action |
|---|---|---|---|---|
| `BackupFailed` | the database backup Job failed | - | critical | `kubectl logs job/<name>`, [backup runbook](runbooks/backup-restore.md) |
| `BackupMissing` | no healthchecks.io ping for 26 hours | 26 h | critical | same as above, check the CronJob was not suspended |
| `RestoreTestOverdue` | last restore test > 35 days ago | - | warning | run [runbook section 6](runbooks/backup-restore.md#6-monthly-restore-test-30-minutes) |
| `AtlasNoBackups` | Atlas free (M0) clusters have **no automatic backups**, so our own backup job is the only copy | - | warning (standing) | check the backup job daily until the cluster has managed backups |

### Security (with Navod)

| Alert | Condition | Severity | First action |
|---|---|---|---|
| `SecretScanFailed` | gitleaks check failed on a PR or push | critical | [secrets.md section 7](secrets.md): rotate first, then remove |
| `DependencyCritical` | critical vulnerability in a dependency scan (Days 9-10) | warning | update the package, tell Navod |

## 4. What an alert message contains

```
[CRITICAL] SiteDown - staging
What: https://<staging-domain>/health returned 503 for 10 minutes
Since: 2026-11-20 14:05 (Sri Lanka time)
First action: kubectl get pods -n remotebpo
Runbook: docs/alerting.md#availability
```

No passwords, tokens, connection strings or personal data in alert messages.

## 5. Daily manual check (until Prometheus, 5 minutes)

```bash
kubectl get pods -n remotebpo                    # all READY, RESTARTS not growing
kubectl get hpa -n remotebpo                     # replicas below the max
kubectl top pods -n remotebpo                    # memory well below limits
kubectl get jobs -n remotebpo                    # last backup job 1/1
```

Plus: UptimeRobot dashboard green, healthchecks.io green, Atlas metrics (connections, storage).

## 6. When an alert fires

1. **Acknowledge** in the group: "I'm looking at SiteDown".
2. Do the **first action** from the table. Use `requestId` from the logs to follow a failing request.
3. Fix or roll back: `kubectl rollout undo deployment/api -n remotebpo` if it started after a deploy.
4. Post **resolved** with one line: cause and fix.
5. If it was critical: short write-up in `docs/runbooks/` (what, why, how to prevent).

## 7. Open items

- [ ] Staging domain known -> create UptimeRobot monitors (Suvethica)
- [ ] healthchecks.io account owned by the company email (lead), backup check created (Suvethica)
- [ ] Decide who receives alerts and who is "on duty" each week (lead)
- [ ] After MVP: Prometheus + Alertmanager with the rules in `infra/monitoring/alert-rules.yml` (Suvethica + Dulieka)
