# Secrets management (draft v1)

Owner: Suvathica (with Navod and Dumindu). Status: Day 1 draft, to be finalised by end of Day 2.

## Rules

1. Real secrets are **never** committed, written in code, or baked into Docker images.
2. `.env.example` is the only env file in Git. It has every variable name with placeholder values.
3. Anything starting with `NEXT_PUBLIC_` is sent to the browser, so it must never hold a secret.
4. Each environment uses **its own** secret values (dev, staging, production never share a JWT secret or DB password).
5. If a secret leaks: rotate it first, then remove it from the code, then tell the team.

## Where secrets live

| Environment | Where | Who can see them |
|---|---|---|
| Local (dev) | `.env` on your own machine (git-ignored) | only you |
| CI (GitHub Actions) | repository / environment **Secrets** | repo admins |
| Staging / production | cloud secret manager (e.g. AWS Secrets Manager / Kubernetes Secrets), injected at runtime | DevOps + Navod |

## Generating strong values

```bash
openssl rand -hex 32   # JWT secrets (64 characters)
```

## To decide (Day 2)

- [ ] Final variable list with Navod and Dumindu
- [ ] Staging secret store (depends on Dulieka's cloud decision)
- [ ] How secrets reach containers (runtime env vars / mounted secrets)
- [ ] Secret scanning in CI (e.g. gitleaks)
