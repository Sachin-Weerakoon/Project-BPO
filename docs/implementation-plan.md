# RemoteBPO Hub — Remaining MVP Implementation Plan

This plan turns the 13 November 2026 SRS/FRS into an ordered delivery sequence, taking account of the code and infrastructure already in the repository. The SRS/FRS is the product baseline; this plan does not treat UI previews or deployment placeholders as completed features.

## 1. Current state

| Area | Present | Still needed |
|---|---|---|
| Web | Next.js 15 scaffold; candidate profile and job-search demo screens/components with local sample data | Real navigation, authentication, API integration, employer/admin screens, complete candidate/job/application flows, accessibility and SEO acceptance |
| API | Runnable Express server, validated config, MongoDB/Mongoose and Redis connections, security headers, request logging, health/readiness, optional metrics, and foundation tests | Domain models/routes, authentication, authorization, business rules, API integration tests, and production persistence |
| Data and local development | `.env.example` and the API now use MongoDB + Redis | Add a working local stack; reconcile existing PostgreSQL/Supabase staging and backup assets before deployment; no Compose file is present |
| Delivery and operations | Kubernetes manifests, monitoring/secret guidance, and PostgreSQL backup/restore assets | Real images, application health integration, CI build/test/scan/deploy, configured staging, TLS/domain, and tested end-to-end restore |

The candidate screens are explicitly previews: their job data is hard-coded, profile review is not persisted, and selecting a resume does not upload it. The API now has a minimal server foundation but no domain routes.

**Branch implementation status:** work is proceeding with MongoDB + Mongoose as the SRS/FRS baseline. The existing PostgreSQL/Supabase staging and backup materials remain unreconciled and must not be used to deploy this implementation until they are updated or the product lead explicitly approves a superseding database decision.

**Completed so far on `test-vmain`:** branch created and checked out; Phase 0 database baseline recorded in ADR 0003; Phase 1 API package, configuration validation, server/app wiring, MongoDB and Redis readiness, and tests are in place. Local Compose and real database integration are still outstanding.

**Validation so far:** API tests (12) and lint pass; API dependency audit reports no vulnerabilities. The existing web app production build passes; its dependency audit reports no vulnerabilities after a compatible PostCSS update. Docker is unavailable in the current environment, so container and live MongoDB/Redis checks have not been run.

## 2. Deployment gate: reconcile the database decision

**Resolve the database conflict before staging.** The SRS/FRS §2.3 specifies MongoDB + Mongoose, while repository ADR 0002 and some existing infrastructure materials specify PostgreSQL/Supabase. ADR 0002 is marked proposed and awaiting lead confirmation. This branch uses the SRS MongoDB baseline for local API development; the product lead must confirm or supersede it before staging.

1. Have the lead confirm MongoDB or approve PostgreSQL/Supabase as the replacement.
2. Record the decision in an accepted ADR and align the SRS reference, `.env.example`, secret inventory, readiness checks, migrations/models, backup/restore, and Kubernetes configuration.
3. Keep exactly one production data store. Do not build a mixed Mongo/Postgres design.

Redis remains the cache/queue/realtime adapter per the SRS. The exact email, object-storage, and image-registry providers also need a team decision before staging integration.

## 3. Ordered delivery phases

Phases are ordered by dependency, not assigned calendar days. The PDF specifies a 14-day MVP and staging by Days 8–10, but does not include the referenced detailed 14-day task allocation. Re-estimate dates and owners with the team; keep the Day 8–10 staging and Day 14 MVP targets as checkpoints.

### Phase 0 — Baseline and acceptance gates

- Confirm the database decision and service providers listed above.
- Convert every Must requirement in §4 into a tracked issue with an owner, acceptance criteria, reviewer, and test approach.
- Agree API contracts and shared enums for Candidate, Company, Job, Application, Assessment, Message, and Notification before frontend/backend integration.
- Confirm MVP boundaries and seed-data rules; use synthetic data only in staging.
- Set up branch/PR ownership and require relevant reviews; security-sensitive changes require Navod’s review.

**Exit:** decisions are recorded, the requirement backlog is traceable, and team members can run the chosen local development setup.

### Phase 1 — Runnable application and data foundation

- Create the API package, Express app/server, configuration validation, centralized error handling, request validation, and versioned `/api/v1` routing.
- Wire the existing logger, request logger, `/health`, `/ready`, and optional internal-only `/metrics` into the server.
- Implement the chosen database connection, models/schema, indexes, seed fixtures, and a repeatable local database initialization process.
- Add Redis connection handling and dependency timeouts; readiness must accurately reflect required dependencies.
- Add API unit/integration test harness and environment-specific configuration without committing real secrets.
- Create Dockerfiles and Docker Compose for web, API, database, Redis, and local email/object-storage substitutes as appropriate.

**Exit:** clean clone can start the complete local stack; health/readiness and automated smoke tests pass.

### Phase 2 — Authentication, authorization, and privacy baseline

- Implement candidate/employer registration, strong password policy (FR-001), verification email (FR-002), login and short-lived access/rotating refresh tokens (FR-003), password reset (FR-004), and failed-login throttling/lockout (FR-006).
- Define candidate, employer, and admin roles; enforce RBAC and resource ownership on every protected route (FR-005).
- Use bcrypt/Argon2id at the SRS-required cost, secure cookie flags where cookies are used, CSRF protections as applicable, Helmet/CSP, and endpoint rate limits.
- Add privacy notice/consent at registration, data-export and deletion request workflows, audit-sensitive actions, and email templates.
- Add security tests for cross-role access, ownership violations, expired/rotated tokens, throttling, and reset/verification token expiry.

**Exit:** anonymous and authenticated flows behave as intended; role/ownership and security tests pass. Navod reviews auth and headers before merge.

### Phase 3 — Candidate profile and secure resume handling

- Persist profile fields from FR-020–022, including BPO process experience, language proficiency, skills/tools, education, timezone, shifts/availability, and workspace readiness.
- Add profile completeness indicator (FR-023, Should) if MVP capacity permits.
- Add validated resume upload using allow-listed types, size limits, private object storage, and short-lived authorized signed URLs; never serve private files from the web root.
- Replace profile preview form with create/edit/read flows backed by the API; retain clear loading, empty, validation, and error states.
- Test unauthorized profile access, invalid/oversized uploads, signed URL access, and export/deletion behavior.

**Exit:** a candidate can register, create/update a persistent profile, and securely manage a resume.

### Phase 4 — Employer, company, and verification

- Implement company profile management (FR-040), logo storage under the same upload controls, and company public page data.
- Build admin-assisted company verification states and verified badge (FR-041).
- Implement employer dashboard foundations for owned company/jobs/applications (FR-042).
- Keep team invitations (FR-043, Should) out of Must scope unless the team confirms time.

**Exit:** employer ownership is enforced; admins can review/verify a company; public company data exposes only approved fields.

### Phase 5 — Job lifecycle and public job pages

- Implement job create/edit with all fields in FR-060: process, required languages/levels, shift/timezones, tools, typing speed, workspace requirements, experience, salary/currency, training, and contract type.
- Add draft/publish/pause/close transitions with authorization and validation (FR-061).
- Add public server-rendered job detail pages and metadata/JobPosting structured data (FR-062).
- Implement expiration and auto-archive via a scheduled worker/queue (FR-063); make processing idempotent.
- Add public company pages showing verification status and open jobs (FR-160).

**Exit:** guests can browse published jobs/company pages; only authorized employers can manage their own jobs; expired jobs are no longer apply-able.

### Phase 6 — Job search, saved jobs, and alerts

- Replace local sample filtering with server-side keyword and faceted search for process, language, shift/timezone, salary, experience, and tools (FR-080).
- Add relevance/date/salary/timezone-match sorting (FR-081), pagination, and stable filter URLs.
- Implement saved jobs and job alerts (FR-024), saved searches and email alerts (FR-083), and user preferences for notification channels (FR-142).
- Add basic compatibility scoring for language, skills, and timezone overlap if feasible (FR-082, Should); do not block core search on this.
- Measure search latency against the SRS target and index the chosen database accordingly.

**Exit:** search and saved-search behavior is persisted, permission-checked, covered by tests, and meets the agreed search performance target.

### Phase 7 — Applications and employer ATS

- Implement guided/one-click apply with a profile and resume snapshot (FR-100), requiring candidate authentication.
- Enforce duplicate-application prevention (FR-104) and prevent applications to unavailable/closed jobs.
- Implement the application state machine (FR-101), status history visible to both parties, and employer-only private notes (FR-102).
- Add candidate withdrawal (FR-103), candidate dashboard with applications/recommended jobs (FR-025), and employer application funnel (FR-042).
- Notify affected parties of application and status changes in later Phase 9.

**Exit:** candidate and employer dashboards agree on each application’s status/history; duplicate, unauthorized, and invalid transitions are rejected and tested.

### Phase 8 — Typing assessment

- Build a timed typing test with server-validated WPM and accuracy results (FR-120).
- Persist results on the profile and/or application with timestamp and test-version metadata.
- Prevent trivial client-side result tampering; define how an assessment is linked to an application and when it is required.
- Optional language/soft-skill quiz is Should (FR-121), and should not delay the required typing test.

**Exit:** test results persist and appear in the intended candidate/employer views with validation coverage.

### Phase 9 — Application messaging and notifications

- Enable in-platform messaging only between the candidate and employer for an existing application (FR-140).
- Add Socket.io and Redis adapter for multi-replica delivery; persist messages and authorize every room/action by application membership.
- Add in-app and email notifications for new applications, status changes, and messages (FR-141).
- Implement user notification preferences (FR-142), unread state, delivery retries, and rate limits.
- Do not log message bodies, credentials, resume URLs, or other sensitive content.

**Exit:** authorized participants can exchange persisted messages; notifications respect preferences; realtime works across API replicas.

### Phase 10 — Trust, reports, reviews, and admin

- Add scam/content reporting and admin takedown/suspension workflows (FR-162).
- Add reviews for payment reliability, training, and management after a defined significant stage (FR-161); define eligibility, moderation, and abuse controls.
- Build an admin area to verify companies, moderate jobs/reviews, view basic KPIs, and inspect an audit log of sensitive actions (FR-180).
- Enforce least privilege, record who performed administrative actions, and test audit completeness for sensitive operations.

**Exit:** moderation and admin actions are permission-controlled, auditable, and have safe user-visible outcomes.

### Phase 11 — Frontend integration and quality pass

- Integrate all candidate demo screens with real API flows; then deliver employer, admin, authentication, application, assessment, and messaging screens.
- Add navigation and role-appropriate routes, session-expiry handling, form validation, and loading/empty/error states.
- Meet mobile-first responsive behavior and WCAG 2.1 AA target for core flows; manually verify keyboard navigation, focus, labels, contrast, and screen-reader status messages.
- Complete SSR/SEO requirements for job and company pages and validate structured data.
- Add focused component/e2e tests for registration, profile/resume, search/apply, employer pipeline, messaging, and admin moderation.

**Exit:** all Must user journeys work end-to-end on mobile and desktop with no demo data presented as live data.

### Phase 12 — CI, container hardening, and staging

- Add GitHub Actions for lint → unit/integration/e2e tests → web/API builds → dependency and image scans → publish images → staging deploy.
- Build multi-stage, minimal, non-root images; pin/version image tags and support the target cluster architecture.
- Complete Kubernetes config, runtime secrets injection, TLS, ingress restrictions, resource limits, probes, network policies, and autoscaling.
- Keep `/ready` and `/metrics` internal; ensure secrets are absent from logs, image layers, frontend bundles, and artifacts.
- Configure monitoring/alerts and an operations runbook; run backup/restore tests against the selected database implementation.
- Deploy to staging by the stated Day 8–10 target where schedule allows; run smoke, role/permission, upload, and failure-recovery tests there.

**Exit:** deployment from a reviewed main-branch change is repeatable; staging passes smoke checks; restore has been demonstrated.

### Phase 13 — MVP acceptance and release

- Run the full requirements-based acceptance suite and close or explicitly defer every Must item.
- Measure SRS performance targets: search/key pages under 1.5 s p95 and simple APIs under 300 ms p95; document method, environment, and results.
- Verify security checklist, dependency/container scan results, WCAG core-flow checklist, privacy notice, export/deletion handling, and backup recovery.
- Confirm no real candidate/employer data is used in staging, all secrets are managed outside Git, and all security-sensitive PRs received Navod review.
- Publish release notes, known limitations, owner/on-call contacts, runbooks, and a post-MVP backlog for Should/Could features.

**Exit:** all Must requirements are demonstrated or formally accepted as blocked/deferred by the product lead; no silent omissions.

## 4. FRS traceability

| Requirement IDs | Planned phase |
|---|---|
| FR-001–006 | Phase 2 |
| FR-007 (Should) | Phase 2 if capacity allows |
| FR-020–022 | Phase 3 |
| FR-023 (Should) | Phase 3 |
| FR-024, FR-080–083 | Phase 6 |
| FR-025 | Phase 7 |
| FR-040–042, FR-160 | Phases 4–5 |
| FR-043 (Should) | Phase 4 if capacity allows |
| FR-060–063 | Phase 5 |
| FR-100–104 | Phase 7 |
| FR-120 | Phase 8 |
| FR-121 (Should) | Phase 8 if capacity allows |
| FR-140–142 | Phase 9 |
| FR-161–162, FR-180 | Phase 10 |
| SRS D.1–D.5 (performance, accessibility, SEO, security, deployment, privacy) | Phases 2, 5–6, 11–13 |

## 5. Cross-cutting completion rules

- Every endpoint validates input, applies authentication/authorization where required, returns a documented response, and has success/failure tests.
- All sensitive resources enforce both role and ownership checks on the server; hiding a UI control is not authorization.
- Keep personal data minimal; private resumes/media require authorized signed URLs; implement the stated export/deletion path.
- Add indexes and query plans for core lookup/search paths; measure the stated p95 thresholds rather than assuming them.
- Keep database, email, storage, and cache credentials out of Git and browser bundles; update `.env.example` and the secret inventory whenever configuration changes.
- Maintain stable API/UI contracts and seed fixtures; no demo fixture should be returned by production endpoints.
- Definition of done for each phase: reviewed PR, automated tests passing, documentation/config updated, no unresolved high-severity security finding, and demonstrated acceptance criteria.

## 6. Source and open decisions

- Product requirements: `RemoteBPO_Hub_Complete_SRS_FRS_and_Collaboration_Guide (2).pdf`, especially SRS §2.3, FRS §C, and NFR/security/deployment §D.
- Existing UI work: `apps/web/src/app/megha-preview/`, `apps/web/src/app/megha-cycle2-preview/`, and `apps/web/src/components/`.
- Existing API work: `apps/api/src/observability/`.
- Existing deployment direction: `docs/decisions/0002-cloud-platform.md`, `docs/secrets.md`, and `infra/k8s/`.
- Decisions still requiring explicit confirmation: database (MongoDB vs PostgreSQL/Supabase), email provider, S3-compatible storage provider, image registry/domain, and staging account ownership/budget.
