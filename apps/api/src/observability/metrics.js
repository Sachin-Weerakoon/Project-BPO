'use strict';

// Placeholder for Prometheus metrics (docs/monitoring.md section 5).
// Off unless METRICS_ENABLED=true. /metrics must not be public: block it in the reverse proxy.
const client = require('prom-client');

function metrics() {
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });

  const httpDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 1.5, 3],
    registers: [register],
  });

  function middleware(req, res, next) {
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      // Route pattern (e.g. /jobs/:id), not the real URL, to keep labels small
      const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
      end({ method: req.method, route, status: res.statusCode });
    });
    next();
  }

  async function handler(req, res) {
    res.set('Content-Type', register.contentType).send(await register.metrics());
  }

  return { middleware, handler, register };
}

module.exports = { metrics };
