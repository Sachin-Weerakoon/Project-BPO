# Monitoring placeholders

Plan: [docs/monitoring.md](../../docs/monitoring.md). Staging: **k3s (Kubernetes) on Oracle Cloud + Supabase PostgreSQL** ([ADR 0002 v3](../../docs/decisions/0002-cloud-platform.md)).
These files are **placeholders**: nothing here runs by default.

| File | What |
|---|---|
| `prometheus.yml` | finds api pods with Kubernetes service discovery and scrapes `/metrics` (inside the cluster only) |
| `alert-rules.yml` | draft alerts: API down, 5xx rate > 5%, p95 > 300 ms, memory |
| `docker-compose.monitoring.yml` | optional Prometheus for **local** testing only (profile `monitoring`, localhost port) |

**Free options for staging now (no Prometheus needed):**

| What | Tool |
|---|---|
| Site up | UptimeRobot on the public `/health` |
| Pods and nodes | `kubectl top pods` / `kubectl top nodes` (k3s metrics-server), `kubectl get pods` for restarts |
| Database | Supabase dashboard: connections, slow queries, database size |
| Servers | Oracle Cloud monitoring: CPU, memory, disk |

**CloudWatch option:** only if we move to AWS (ADR 0002 option E). Then send container logs to CloudWatch and use CloudWatch alarms for the same rules.
