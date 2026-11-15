# RemoteBPO Hub

A job platform built only for **remote BPO (Business Process Outsourcing)** roles: customer support,
tech support, data entry, back-office and more. Candidates build BPO-aware profiles and take a typing
test; employers post jobs and manage applications; admins verify companies and moderate content.

> 14-day MVP by the Raxwo internship team. The SRS/FRS and the 14-day task plan are the source of truth.

## Repository layout

```text
apps/
  web/        Next.js 15 frontend (App Router, Tailwind, shadcn/ui)
  api/        Node.js + Express backend (MongoDB, Redis)
infra/        Docker, Compose profiles, deployment and cloud files
docs/
  runbooks/   operations runbooks (deploy, backup/restore, incidents)
  decisions/  short architecture decision records (ADRs)
.github/
  workflows/  GitHub Actions (CI/CD)
  pull_request_template.md
docker-compose.yml   local stack (added by DevOps)
.env.example         every environment variable, with placeholder values only
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + React + Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express |
| Database | MongoDB (Atlas) + Mongoose |
| Cache / queue | Redis + BullMQ |
| Auth | JWT (access + refresh), bcrypt/Argon2id |
| Realtime | Socket.io |
| Storage | S3-compatible (resumes, logos) |
| Containers | Docker multi-stage, Docker Compose (local), Kubernetes or ECS (staging) |
| CI/CD | GitHub Actions |

## Getting started

```bash
git clone git@github.com:Sachin-Weerakoon/Project-BPO.git
cd Project-BPO
cp .env.example .env        # fill in real values locally. Never commit .env
git checkout -b feature/<your-name>-<short-description>
```

Run instructions for the local stack (Docker Compose) will be added here once `apps/` and `docker-compose.yml` exist.

## How we work

- **Never push to `main`.** Work on a branch and open a pull request.
- Commit **at least once a day** with a clear message.
- Never commit `.env`, keys or passwords. Only `.env.example` is committed.
- Security-related PRs (auth, RBAC, uploads, headers) need **Navod's** review.

Full rules: [CONTRIBUTING.md](CONTRIBUTING.md) · Secrets: [docs/secrets.md](docs/secrets.md)

## Team

| Name | Track | Focus |
|---|---|---|
| Duleesha | SE | Frontend (Next.js, UI, forms) |
| Megha | SE | Frontend, candidate flows, profile and search UI |
| Sathsarani | SE | Backend (Express APIs, MongoDB models) |
| Dumindu | DevOps | Docker, CI/CD, local and staging environment |
| Dulieka | DevOps | Cloud infrastructure, Kubernetes/ECS, networking |
| Suvethica | DevOps | Repo setup, secrets, logging, monitoring, backups |
| Navod | DevSecOps | Security (auth, headers, scanning, WAF, secrets review) |
