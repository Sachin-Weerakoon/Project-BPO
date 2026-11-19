'use strict';

// Shared JSON logger. Standard: docs/logging.md
const pino = require('pino');

const isLocal = (process.env.NODE_ENV || 'development') === 'development';

// Never log secrets or personal data (docs/logging.md section 4)
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.email',
  '*.phone',
];

function createLogger(options = {}) {
  return pino(
    {
      level: process.env.LOG_LEVEL || (isLocal ? 'debug' : 'info'),
      base: { service: 'api', env: process.env.NODE_ENV || 'development' },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      ...options,
    },
    options.destination,
  );
}

const logger = createLogger();

module.exports = { logger, createLogger, REDACT_PATHS };
