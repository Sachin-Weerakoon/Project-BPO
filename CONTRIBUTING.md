# Contributing to RemoteBPO Hub

## 1. Branches

`main` is protected: stable, reviewed code only. **Never push directly to `main`.**

| Type | Pattern | Example | Use for |
|---|---|---|---|
| Feature | `feature/<name>-<short-description>` | `feature/duleesha-auth-ui` | new functionality |
| Bug fix | `fix/<name>-<short-description>` | `fix/megha-profile-form-validation` | fixing a bug |
| Chore / infra | `chore/<name>-<topic>` or `infra/<name>-<topic>` | `infra/dumindu-docker-compose` | Docker, CI, config, tooling |
| Security | `security/<name>-<topic>` | `security/navod-headers` | security improvements |
| Docs | `docs/<name>-<topic>` | `docs/suvethica-runbook` | documentation only |

Start every branch from the latest `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/<your-name>-<short-description>
```

Keep it up to date while you work:

```bash
git checkout main && git pull origin main
git checkout <your-branch> && git merge main
git push origin <your-branch>
```

## 2. Commits

Commit **at least once a day**, even if the feature is not finished. Use Conventional Commits:

```text
feat(auth): add login form UI and validation
fix(jobs): stop duplicate applications to the same job
chore(ci): add lint step to the CI workflow
docs: add backup and restore runbook
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`, `security`.

## 3. Pull requests

1. Push your branch and open a PR into `main` (GitHub shows **Compare & pull request**).
2. Fill in the PR template: what changed, how to test, screenshots for UI changes, related task.
3. Request **at least one reviewer**, preferably from the same track (SE reviews SE, DevOps reviews DevOps).
4. **Navod must review** anything touching auth, RBAC, file uploads, security headers or secrets.
5. **Do not merge your own PR** (except designated maintainers for trivial docs changes).
6. CI must be green before merging. Prefer **Squash and merge** to keep `main` history clean.
7. Delete the branch after it is merged.

## 4. Environment variables and secrets

- `.env.example` is committed. It lists every variable with **placeholder values only**.
- Copy it locally: `cp .env.example .env`, then put real values in `.env`.
- `.env` and every `.env.*` file (except `.env.example`) are in `.gitignore`. Check before your first commit: `git check-ignore .env` should print `.env`.
- Staging and production secrets live in the cloud secret manager or GitHub Actions secrets. Never in the repo, never in Docker images.
- If a secret is committed by mistake: tell the team immediately, **rotate the secret**, then remove it from the code. Deleting the line is not enough, because it stays in Git history.

Details: [docs/secrets.md](docs/secrets.md)

## 5. Daily checklist

- [ ] Pulled the latest `main` before starting new work
- [ ] Working on my own branch
- [ ] At least one meaningful commit today, pushed to origin
- [ ] Opened a PR when a logical chunk was ready, and requested review
- [ ] No `.env` or real secrets committed
- [ ] Updated the task board / standup notes

## 6. Never

- Push directly to `main`
- Commit `.env`, API keys, passwords, tokens or private keys
- Merge your own PR without review
- Put real personal data in seed data, screenshots or logs

## 7. Getting help

Raise blockers in the team channel or at the daily standup. If you are stuck for more than 4 hours, ask the lead.
