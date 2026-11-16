# Observability (logging, health, metrics)

Owner: Suvethica (DevOps). Standard: [docs/logging.md](../../../../docs/logging.md), plan: [docs/monitoring.md](../../../../docs/monitoring.md).

Ready to plug into the API when the Express scaffold is merged.

## 1. Install (in `apps/api`)

```bash
npm install pino pino-http
npm install -D pino-pretty          # local pretty logs only
npm install prom-client             # only if METRICS_ENABLED is used
```

## 2. Wire into the app (`src/app.js`)

```js
const { logger, requestLogger, healthRouter } = require('./observability');

app.use(requestLogger());                 // first, before routes
app.use(healthRouter({
  mongo: async () => mongoose.connection.readyState === 1,
  redis: async () => (await redis.ping()) === 'PONG',
}));

// optional metrics placeholder
if (process.env.METRICS_ENABLED === 'true') {
  const { metrics } = require('./observability/metrics');
  const m = metrics();
  app.use(m.middleware);
  app.get('/metrics', m.handler);         // block /metrics in the reverse proxy
}
```

Use the same logger everywhere (no `console.log`):

```js
const { logger } = require('./observability');
logger.info({ jobId: job.id }, 'job published');
req.log.warn({ userId }, 'login failed');      // req.log keeps the requestId
```

Local pretty logs: `node src/server.js | npx pino-pretty`

## 3. Environment variables

| Variable | Default | Notes |
|---|---|---|
| `LOG_LEVEL` | `debug` local, `info` otherwise | `error`, `warn`, `info`, `debug` |
| `GIT_SHA` | - | shown as `version` on `/health` (set by CI) |
| `METRICS_ENABLED` | `false` | turns on `/metrics` |

## 4. Tests

```bash
node --test src/observability/observability.test.js
```

Checks: standard fields, `X-Request-Id`, no passwords/tokens/emails/cookies in logs, 4xx = warn, 5xx = error, `/health`, `/ready` (200 / 503).
