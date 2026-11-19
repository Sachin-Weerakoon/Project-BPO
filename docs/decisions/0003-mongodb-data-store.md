# 0003 — MongoDB as the MVP data-store baseline

Status: Implementation baseline; product lead confirmation required before staging
Date: 19 November 2026

## Context

The SRS/FRS §2.3 names MongoDB + Mongoose as the confirmed database stack and is
the product requirements baseline. ADR 0002 and the current staging/backup
materials instead describe PostgreSQL/Supabase, and ADR 0002 remains proposed.
The API implementation needs one unambiguous local data-store target.

## Decision

Implement the MVP API against MongoDB + Mongoose, following the SRS/FRS. This
decision supersedes the PostgreSQL/Supabase database selection in ADR 0002 for
application development. It does not decide the hosting provider, cloud account,
or other infrastructure choices.

Before staging, the product lead must either confirm this baseline or approve a
replacement decision. Do not deploy the MongoDB API using the existing
PostgreSQL-only readiness checks, Kubernetes secret inventory, or `pg_dump`
backup jobs. Update and test those components for the final selected database.

## Consequences

- Local and API development configuration uses `MONGODB_URI`.
- API persistence will use Mongoose; do not introduce a parallel PostgreSQL data
  store.
- The Compose stack, staging connection, backup/restore, secret inventory, and
  Kubernetes manifests must be reconciled before staging.
- Redis remains the planned cache, queue, and realtime adapter.
