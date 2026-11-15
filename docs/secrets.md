# Secrets management

- **Owner:** Suvathica (with Navod for security review, Dumindu for CI, Dulieka for cloud)
- **Status:** v2 (Day 2). Staging store follows [ADR 0002](decisions/0002-cloud-platform.md) (AWS ECS Fargate, draft). If the cloud decision changes, only section 4 changes.

## 1. Rules

1. Real secrets are **never** committed, written in code, put in Docker images, or printed in logs.
2. `.env.example` is the only env file in Git: every variable name with **placeholder** values.
3. Anything starting with `NEXT_PUBLIC_` is built into the browser bundle. It must **never** hold a secret.
4. Every environment has **its own** values. Dev, staging and production never share a JWT secret, a database user or an access key.
5. Least privilege: each service and each pipeline can read **only** the secrets it needs.
6. A leaked secret is **rotated first**, then removed from code (see section 7).

## 2. Secret inventory

| Variable | Used by | Secret? | Local (dev) | Staging |
|---|---|---|---|---|
| `NODE_ENV` | api, web | no | `.env` | task definition (plain) |
| `API_PORT` | api | no | `.env` | task definition (plain) |
| `APP_URL` | api | no | `.env` | task definition (plain) |
| `CORS_ORIGIN` | api | no | `.env` | task definition (plain) |
| `LOG_LEVEL` | api | no | `.env` | task definition (plain) |
| `MONGODB_URI` | api | **yes** (DB password) | `.env` (local Mongo, no password) | SSM SecureString |
| `REDIS_URL` | api | **yes** if it has a password | `.env` (local Redis) | SSM SecureString |
| `JWT_ACCESS_SECRET` | api | **yes** | `.env` (generate your own) | SSM SecureString |
| `JWT_REFRESH_SECRET` | api | **yes** | `.env` (generate your own) | SSM SecureString |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | api | no | `.env` | task definition (plain) |
| `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM` | api | no | `.env` | task definition (plain) |
| `SMTP_USER`, `SMTP_PASS` | api | **yes** | `.env` (test inbox, e.g. Mailpit) | SSM SecureString |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` | api | no | `.env` | task definition (plain) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | api | **yes** | `.env` (local MinIO only) | **not used**: the task's IAM role gives S3 access |
| `NEXT_PUBLIC_API_URL` | web (browser) | no | `.env` | build argument per environment |

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

## 4. Staging and production (AWS)

**Store:** AWS **SSM Parameter Store, SecureString** (encrypted with KMS; the standard tier is free).
AWS Secrets Manager is only needed later if we want automatic rotation (for example database passwords).

**Naming:** one parameter per secret, per environment:

```text
/remotebpo/staging/MONGODB_URI
/remotebpo/staging/JWT_ACCESS_SECRET
/remotebpo/staging/JWT_REFRESH_SECRET
/remotebpo/staging/SMTP_USER
/remotebpo/staging/SMTP_PASS
/remotebpo/staging/REDIS_URL
/remotebpo/prod/...               (same names, different values)
```

**Injection at runtime:** the ECS task definition maps each parameter to an environment variable with
`secrets` / `valueFrom`. ECS fetches the value when the container starts, so it is never in the image or in Git.

```json
"secrets": [
  { "name": "JWT_ACCESS_SECRET", "valueFrom": "arn:aws:ssm:<region>:<account>:parameter/remotebpo/staging/JWT_ACCESS_SECRET" }
]
```

**Who can read them (least privilege):**

| Identity | Access |
|---|---|
| ECS **task execution role** (staging) | `ssm:GetParameters` on `/remotebpo/staging/*` + `kms:Decrypt` for that key. Nothing else |
| ECS **task role** (api) | S3 read/write on the resumes/logos bucket only. No SSM access |
| GitHub Actions deploy role | push to ECR and update the ECS service. **No** read access to the parameters |
| Team members | DevOps + Navod can write staging parameters. Nobody needs to read them day to day |

**`NEXT_PUBLIC_*` values** are not secrets. They are passed as build arguments when the web image is built for each environment.

## 5. CI/CD (GitHub Actions)

- Deploy to AWS with **OIDC** (GitHub assumes an IAM role for a few minutes). **No long-lived AWS keys** stored in GitHub.
- Use a GitHub **environment** called `staging` (later `production`) for deploy settings, with required reviewers for production.
- Workflows print no secrets (`::add-mask::` for anything sensitive, never `echo` a secret).
- Pull requests from forks do not get secrets (GitHub default; keep it that way).

## 6. Secret scanning

- **CI:** `.github/workflows/secret-scan.yml` runs [gitleaks](https://github.com/gitleaks/gitleaks) on every push and pull request, over the full history. A finding fails the check.
- **Optional, before you commit:** `gitleaks protect --staged` (install gitleaks locally) catches a secret before it ever reaches GitHub.
- Test values that look like secrets (in tests or docs) must be clearly fake, e.g. `change_me`.

## 7. If a secret leaks

1. **Rotate it now**: create a new value (new JWT secret, new DB password, new SMTP password) and update the SSM parameter or your `.env`.
2. Redeploy so services use the new value. (A new JWT secret signs everyone out: expected.)
3. Remove it from the code in a PR. It stays in Git history, which is why step 1 comes first.
4. Tell the team channel and Navod: what leaked, when, and what was rotated.
5. Check logs for misuse while it was exposed.

## 8. Rotation schedule (staging)

| Secret | Rotate |
|---|---|
| JWT secrets | on any suspected leak, and before production launch |
| MongoDB user password | every 90 days, or when someone leaves the project |
| SMTP password | when the provider or a team member changes |

## 9. Open items

- [ ] Lead confirms the cloud platform (ADR 0002). If not AWS, update section 4 only.
- [ ] Navod reviews this document and the IAM permissions in section 4.
- [ ] Dumindu adds the OIDC deploy role to the CI pipeline when staging deploy starts (Cycle 4).
