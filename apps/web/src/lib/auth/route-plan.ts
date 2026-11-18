/**
 * Proposed App Router structure for later integration; these routes do not exist yet:
 *
 * app/(auth)/login, register, forgot-password   Public UI (implemented)
 * app/(candidate)/candidate/dashboard/page.tsx Candidate area
 * app/(employer)/employer/dashboard/page.tsx   Employer area
 * app/(admin)/admin/dashboard/page.tsx         Admin area
 *
 * Route groups organize layouts; they provide no authorization boundary.
 * Before adding protected content, verify the server-managed session and role on
 * the server for every protected page, action, and backend request. Do not use
 * registration choices, URL parameters, or browser storage as authorization.
 * Admin provisioning and role assignment belong to the backend, not public signup.
 * FR-002: backend-verified email is required before full access.
 * FR-003: the SRS calls for JWT access/refresh tokens (httpOnly preferred).
 * Session transport and integration await the backend architecture decision;
 * this frontend must not create tokens or store them in browser storage.
 * FR-004: reset tokens must be time-limited and verified by the backend.
 * FR-005: only Employers post jobs, only Candidates apply; Admin rights must be
 * checked server-side against an explicit permissions policy for each operation.
 * No middleware, redirect, session, or API contract is assumed in this proposal.
 */
export const proposedRoleRoutes = {
  candidate: '/candidate/dashboard',
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
} as const;
