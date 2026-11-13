# ADR 0001: Repository structure and branching

- **Status:** proposed (Day 1)
- **Owners:** Suvathica (repo conventions), Dumindu (monorepo decision)

## Decision

One repository (monorepo) with `apps/web` (Next.js), `apps/api` (Express), `infra/` (Docker and deployment),
`docs/` (runbooks and decisions) and `.github/` (CI and PR template).

`main` is protected. Everyone works on short-lived branches (`feature/`, `fix/`, `chore/` or `infra/`,
`security/`, `docs/`) and merges through reviewed pull requests.

## Why

- One place for code, Docker, CI and docs, so changes that touch both apps go in one PR.
- Matches the SRS rule: no separate repositories for this project.
- Clear branch names show who owns what.

## Consequences

- CI should build only what changed (path filters) to stay fast.
- Shared types/contracts between web and api can live in a `packages/` folder later if needed.
