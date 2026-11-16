# Secrets management

- **Owner:** Suvethica (with Navod for security review, Dumindu for CI, Dulieka for cloud)
- **Status:** v3 (Day 3). Staging follows [ADR 0002 v2](decisions/0002-cloud-platform.md): **one Oracle Cloud free VM with Docker Compose + MongoDB Atlas Free** (proposed, waiting for the lead). The earlier AWS plan is kept in section 10 in case the decision changes.

## 1. Rules

1. Real secrets are **never** committed, written in code, put in Docker images, or printed in logs.
2. `.env.example` is the only env file in Git: every variable name with **placeholder** values.
3. Anything starting with `NEXT_PUBLIC_` is built into the browser bundle. It must **never** hold a secret.
4. Every environment has **its own** values. Dev, staging and production never share a JWT secret, a database user or an access key.
5. Least privilege: each service and each pipeline can read **only** the secrets it needs.
6. A leaked secret is **rotated first**, then removed from code (see section 7).

## 2. Secret inventory

| Variable | Used by | Secret? | Local (dev) | Staging (VM) |
|---|---|---|---|---|
| `NODE_ENV` | api, web | no | `.env` | VM `.env` |
| `API_PORT` | api | no | `.env` | VM `.env` |
| `APP_URL` | api | no | `.env` | VM `.env` |
| `CORS_ORIGIN` | api | no | `.env` | VM `.env` |
| `LOG_LEVEL` | api | no | `.env` | VM `.env` |
| `MONGODB_URI` | api | **yes** (DB password) | `.env` (local Mongo, no password) | VM `.env` (secret) |
| `REDIS_URL` | api | **yes** if it has a password | `.env` (local Redis) | VM `.env` (secret) |
| `JWT_ACCESS_SECRET` | api | **yes** | `.env` (generate your own) | VM `.env` (secret) |
| `JWT_REFRESH_SECRET` | api | **yes** | `.env` (generate your own) | VM `.env` (secret) |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | api | no | `.env` | VM `.env` |
| `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM` | api | no | `.env` | VM `.env` |
| `SMTP_USER`, `SMTP_PASS` | api | **yes** | `.env` (test inbox, e.g. Mailpit) | VM `.env` (secret) |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` | api | no | `.env` | VM `.env` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | api | **yes** | `.env` (local MinIO only) | VM `.env` (secret), only if object storage needs keys |
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

## 4. Staging (Oracle VM + Docker Compose)

**Store:** one env file **on the VM only**: `/opt/remotebpo/.env`

| Rule | How |
|---|---|
| Not in Git or images | the file exists only on the VM. Compose reads it with `env_file:` at start-up |
| Only the deploy user can read it | owner `deploy`, permissions `600` (`chmod 600 /opt/remotebpo/.env`) |
| Safe server access | SSH with keys only (no passwords), SSH open only to team IPs (Navod reviews the security list) |
| Not lost if the VM is lost | the real values are also kept in the team password manager, owned by DevOps |
| Separate from local | staging gets its **own** JWT secrets and its **own** Atlas database user |

**Updating a secret on staging:**

```bash
ssh deploy@<vm-ip>
nano /opt/remotebpo/.env          # change the value
docker compose up -d              # restart containers so they read the new value
```

**MongoDB Atlas:** a separate database user for staging with access to the staging database only.
The Atlas IP access list allows **only the VM's public IP**.

**`NEXT_PUBLIC_*` values** are not secrets. They are passed as build arguments when the web image is built.

## 5. CI/CD (GitHub Actions)

- CI deploys to the VM over **SSH**. GitHub Actions **environment** `staging` holds:
  `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_KEY` (a deploy-only key), `STAGING_SSH_KNOWN_HOSTS`.
- CI **never** writes or prints the app secrets: it only pulls the new images and runs `docker compose up -d`.
  The app secrets stay in `/opt/remotebpo/.env`.
- Workflows print no secrets (`::add-mask::` for anything sensitive, never `echo` a secret).
- Pull requests from forks do not get secrets (GitHub default; keep it that way).

## 6. Secret scanning

- **CI:** `.github/workflows/secret-scan.yml` runs [gitleaks](https://github.com/gitleaks/gitleaks) on every push and pull request, over the full history. A finding fails the check.
- **Optional, before you commit:** `gitleaks protect --staged` (install gitleaks locally) catches a secret before it ever reaches GitHub.
- Test values that look like secrets (in tests or docs) must be clearly fake, e.g. `change_me`.

## 7. If a secret leaks

1. **Rotate it now**: create a new value (new JWT secret, new DB password, new SMTP password) and update `/opt/remotebpo/.env` on the VM (or your local `.env`).
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

- [ ] Lead approves ADR 0002 v2 (Oracle VM). If it changes, update section 4.
- [ ] Navod reviews this document, the VM security list and SSH access.
- [ ] Dumindu adds the SSH deploy step and the `staging` environment secrets when staging deploy starts (Cycle 4).
- [ ] Choose the team password manager for the staging values (e.g. Bitwarden free organisation).

## 10. If we move to AWS later (paid option, ADR 0002 option D)

- Store secrets in **AWS SSM Parameter Store** (SecureString), one per secret: `/remotebpo/<env>/<VAR>`.
- The ECS task definition injects them at start-up with `secrets` / `valueFrom`. Nothing in images or Git.
- Task execution role: `ssm:GetParameters` on `/remotebpo/<env>/*` + `kms:Decrypt` only. Task role: S3 bucket access only.
- GitHub Actions deploys with **OIDC** (no stored AWS keys).
