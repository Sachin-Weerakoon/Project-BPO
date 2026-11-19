# Secrets management

- **Owner:** Suvethica (with Navod for security review, Dumindu for CI, Dulieka for cloud)
- **Status:** v4 (Day 5). Staging follows [ADR 0002 v3](decisions/0002-cloud-platform.md): **k3s (Kubernetes) on Oracle Cloud free VMs + Supabase PostgreSQL** (proposed, waiting for the lead). Earlier options are kept in section 10.

> **Implementation alignment:** the API branch follows the SRS/FRS MongoDB baseline recorded in
> [ADR 0003](decisions/0003-mongodb-data-store.md). This PostgreSQL/Supabase secret inventory is
> not valid for the current API implementation or staging until the product lead resolves the
> database decision and this document, Kubernetes secrets, and backup jobs are updated together. Earlier options are kept in section 10.

## 1. Rules

1. Real secrets are **never** committed, written in code, put in Docker images, or printed in logs.
2. `.env.example` is the only env file in Git: every variable name with **placeholder** values.
3. Anything starting with `NEXT_PUBLIC_` is built into the browser bundle. It must **never** hold a secret.
4. Every environment has **its own** values. Dev, staging and production never share a JWT secret, a database user or an access key.
5. Least privilege: each service and each pipeline can read **only** the secrets it needs.
6. A leaked secret is **rotated first**, then removed from code (see section 7).

## 2. Secret inventory

| Variable | Used by | Secret? | Local (dev) | Staging (k3s) |
|---|---|---|---|---|
| `NODE_ENV` | api, web | no | `.env` | ConfigMap `api-config` (`production`) |
| `API_PORT` | api | no | `.env` | ConfigMap `api-config` |
| `APP_URL` | api | no | `.env` | ConfigMap `api-config` |
| `CORS_ORIGIN` | api | no | `.env` | ConfigMap `api-config` |
| `LOG_LEVEL` | api | no | `.env` | ConfigMap `api-config` |
| `DATABASE_URL` | api | **yes** (DB password) | `.env` (local Postgres) | Secret `api-secrets`: Supabase **pooler** URL |
| `DATABASE_DIRECT_URL` | migrations only | **yes** | `.env` (same as `DATABASE_URL`) | Secret `api-secrets`: Supabase **direct** URL (migrations need it, the pooler does not support them) |
| `POSTGRES_USER`, `POSTGRES_DB` | local postgres container | no | `.env` | not used (Supabase) |
| `POSTGRES_PASSWORD` | local postgres container | **yes** (dev only) | `.env` | not used (Supabase) |
| `SUPABASE_URL` | api | no | `.env` (empty if not used) | ConfigMap `api-config` |
| `SUPABASE_SERVICE_ROLE_KEY` | api only, if it uses the Supabase client | **yes**: full database access, bypasses RLS | `.env` (empty if not used) | Secret `api-secrets`. **Never** in `web`, never `NEXT_PUBLIC_` |
| `REDIS_URL` | api | **yes** if it has a password | `.env` (local Redis) | Secret `api-secrets` (in-cluster `redis://redis:6379`) |
| `JWT_ACCESS_SECRET` | api | **yes** | `.env` (generate your own) | Secret `api-secrets` |
| `JWT_REFRESH_SECRET` | api | **yes** | `.env` (generate your own) | Secret `api-secrets` |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | api | no | `.env` | ConfigMap `api-config` |
| `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM` | api | no | `.env` | ConfigMap `api-config` |
| `SMTP_USER`, `SMTP_PASS` | api | **yes** | `.env` (test inbox, e.g. Mailpit) | Secret `api-secrets` |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` | api | no | `.env` | ConfigMap `api-config` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | api | **yes** | `.env` (local MinIO only) | Secret `api-secrets` (object storage keys) |
| `NEXT_PUBLIC_API_URL` | web (browser) | no | `.env` | build argument per environment |

The Supabase **anon** key is not used: Supabase is the database only (ADR 0002 assumption A1). If we start using Supabase Auth or Storage, add it here first.

Adding a variable: add it to `.env.example` and to this table **in the same PR**, and say in the PR whether it is a secret.

## 3. Local development

```bash
cp .env.example .env
openssl rand -hex 32   # use the output for JWT_ACCESS_SECRET
openssl rand -hex 32   # and a different one for JWT_REFRESH_SECRET
```

- Docker Compose reads `.env` (`env_file: .env`). Nothing is copied into images.
- Check `.env` is ignored before your first commit: `git check-ignore .env` must print `.env`.
- Never share your `.env` file in chat. Share only variable **names**.

## 4. Staging (Kubernetes Secrets on k3s)

**Store:** Kubernetes Secret **`api-secrets`** in namespace `remotebpo`. Non-secret settings are in ConfigMap `api-config` (`infra/k8s/base/api-config.yaml`).
The API Deployment loads both with `envFrom` (already in `infra/k8s/base/api.yaml`).

| Rule | How |
|---|---|
| Not in Git or images | `api-secrets` is **created by the deploy pipeline** from GitHub Actions secrets. No Secret YAML with real values is ever committed |
| Encrypted on disk | k3s started with `--secrets-encryption` (Secrets are only base64 in YAML, not encrypted, without it) |
| Only who needs it can read it | the CI service account can manage Secrets in `remotebpo` only. Team members do not need `get secrets`. Pods outside `api` do not mount `api-secrets` |
| Not shown by mistake | never run `kubectl get secret api-secrets -o yaml` while sharing a screen. Check names only: `kubectl get secrets -n remotebpo` |
| Not lost if the cluster is lost | the real values live in GitHub Actions secrets (source of truth). A rebuilt cluster gets them on the next deploy |
| Separate from local | staging has its **own** JWT secrets and its **own** Supabase project and database password |

**How the pipeline creates it** (Dumindu's deploy job):

```bash
kubectl -n remotebpo create secret generic api-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=DATABASE_DIRECT_URL="$DATABASE_DIRECT_URL" \
  --from-literal=JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --from-literal=REDIS_URL="$REDIS_URL" \
  --from-literal=SMTP_USER="$SMTP_USER" --from-literal=SMTP_PASS="$SMTP_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -
```

`--dry-run=client -o yaml | kubectl apply` creates it the first time and updates it after. The YAML only goes through the pipe, never into a file or the log.

**Updating a secret:** change it in GitHub (**Settings → Environments → staging**), re-run the deploy, then
`kubectl -n remotebpo rollout restart deployment/api` (pods read env variables only at start-up).

**Supabase database:**
- `DATABASE_URL` uses the **connection pooler** (port `6543`) so many API pods share a few database connections. Migrations use `DATABASE_DIRECT_URL`.
- Both require SSL (`sslmode=require`). Use a strong generated database password.
- If our plan supports network restrictions, allow only the cluster's outgoing IP.

**`NEXT_PUBLIC_*` values** are not secrets. They are passed as build arguments when the web image is built.

## 5. CI/CD (GitHub Actions)

- GitHub Actions **environment** `staging` holds the app secrets above and `KUBECONFIG_STAGING`:
  a kubeconfig for a **deploy-only service account** limited to the `remotebpo` namespace (not the k3s admin kubeconfig).
- The workflow writes the kubeconfig to a temporary file with permissions `600` and deletes it at the end.
- Workflows print no secrets (`::add-mask::` for anything sensitive, never `echo` a secret, no `set -x` in deploy steps).
- Pull requests from forks do not get secrets (GitHub default; keep it that way).
- Only the `main` branch can deploy to `staging` (environment protection rule).

## 6. Secret scanning

- **CI:** `.github/workflows/secret-scan.yml` runs [gitleaks](https://github.com/gitleaks/gitleaks) on every push and pull request, over the full history. A finding fails the check.
- **Optional, before you commit:** `gitleaks protect --staged` (install gitleaks locally) catches a secret before it ever reaches GitHub.
- Test values that look like secrets (in tests or docs) must be clearly fake, e.g. `change_me`.

## 7. If a secret leaks

1. **Rotate it now**: create a new value (new JWT secret, new Supabase database password, new SMTP password), update it in GitHub Actions secrets (or your local `.env`).
2. Re-run the deploy and `kubectl rollout restart deployment/api` so pods use the new value. (A new JWT secret signs everyone out: expected.)
3. Remove it from the code in a PR. It stays in Git history, which is why step 1 comes first.
4. Tell the team channel and Navod: what leaked, when, and what was rotated.
5. Check logs for misuse while it was exposed.

## 8. Rotation schedule (staging)

| Secret | Rotate |
|---|---|
| JWT secrets | on any suspected leak, and before production launch |
| Supabase database password | every 90 days, or when someone leaves the project (reset in Supabase: Project Settings → Database) |
| `SUPABASE_SERVICE_ROLE_KEY` (if used) | on any suspected leak |
| `KUBECONFIG_STAGING` service account token | when someone leaves the DevOps team |
| SMTP password | when the provider or a team member changes |

## 9. Open items

- [ ] Lead confirms ADR 0002 v3 (k3s + Supabase). If it changes, update sections 2, 4 and 5.
- [ ] Dulieka: k3s installed with `--secrets-encryption`, deploy-only service account for CI.
- [ ] Dumindu: deploy job creates `api-secrets` (section 4) and uses the `staging` environment.
- [ ] Navod reviews this document, the Kubernetes Secret access (RBAC) and the Supabase key handling.

## 10. Earlier options (kept for reference)

- **Single VM + Docker Compose (ADR v2):** secrets in `/opt/remotebpo/.env` on the VM, owner `deploy`, permissions `600`, SSH key-only access.
- **AWS (ADR option E):** AWS SSM Parameter Store (SecureString) per secret, injected by the ECS task definition (`valueFrom`), GitHub Actions deploys with OIDC.
