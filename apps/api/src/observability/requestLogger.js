'use strict';

// Request logging middleware: one JSON line per request. Standard: docs/logging.md
const { randomUUID } = require('node:crypto');
const pinoHttp = require('pino-http');
const { logger: defaultLogger } = require('./logger');

const QUIET_PATHS = new Set(['/health', '/ready', '/metrics']);
const VALID_ID = /^[A-Za-z0-9._-]{1,64}$/;

function requestLogger(logger = defaultLogger) {
  return pinoHttp({
    logger,
    // Reuse a safe incoming X-Request-Id, otherwise make a new one, and send it back
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const id = typeof incoming === 'string' && VALID_ID.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel(req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      if (QUIET_PATHS.has(req.url.split('?')[0])) return 'debug';
      return 'info';
    },
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',
    customAttributeKeys: { responseTime: 'durationMs' },
    // Log only safe fields: no headers, bodies, query strings or IPs
    serializers: {
      req: () => undefined,
      res: () => undefined,
    },
    customProps(req, res) {
      return {
        requestId: req.id,
        method: req.method,
        path: (req.originalUrl || req.url).split('?')[0],
        status: res.statusCode,
        userId: req.user?.id ? String(req.user.id) : undefined,
        role: req.user?.role,
      };
    },
  });
}

module.exports = { requestLogger };
