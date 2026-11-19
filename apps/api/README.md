# apps/api

Node.js + Express backend. Owner: Sathsarani.

## Local setup

From this directory:

```bash
npm ci
```

Set `MONGODB_URI`, `REDIS_URL`, and `CORS_ORIGIN` in the repository's local `.env` file
(see the root `.env.example`), then start the service:

```bash
npm run dev
npm test
```

The API listens on port `5000` by default. `GET /health` checks the process,
`GET /ready` checks MongoDB and Redis, and `GET /api/v1` reports the API version.
The development server fails at startup if required configuration or dependencies
are unavailable; it does not report a ready state without both data services.

The current data-store baseline follows MongoDB + Mongoose in the SRS/FRS. The
proposed PostgreSQL/Supabase infrastructure notes still need reconciliation before
staging deployment.
