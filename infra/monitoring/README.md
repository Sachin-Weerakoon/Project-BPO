# Monitoring placeholders

Plan: [docs/monitoring.md](../../docs/monitoring.md). These files are **placeholders**: nothing here runs by default.

| File | What |
|---|---|
| `prometheus.yml` | scrape config for the API `/metrics` (internal network only) |
| `alert-rules.yml` | draft alerts: API down, 5xx rate > 5%, p95 > 300 ms, memory |
| `docker-compose.monitoring.yml` | optional Prometheus container (profile `monitoring`, localhost port only) |

**CloudWatch option:** only if we move to AWS (ADR 0002 option D). Then send container logs with the `awslogs` driver and use CloudWatch alarms for the same rules.

**Free options for the Oracle VM now:** UptimeRobot for `/health`, Oracle Cloud monitoring for CPU/memory/disk, `pg_isready` health check and slow query log (`log_min_duration_statement`) for PostgreSQL.
