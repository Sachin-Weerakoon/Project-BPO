'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { logger: defaultLogger } = require('./observability/logger');
const { requestLogger } = require('./observability/requestLogger');
const { healthRouter } = require('./observability/health');
const { metrics } = require('./observability/metrics');

function createApp({
  corsOrigins = ['http://localhost:3000'],
  readinessChecks = {},
  metricsEnabled = false,
  logger = defaultLogger,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || corsOrigins.includes(origin));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(healthRouter(readinessChecks, { logger }));

  if (metricsEnabled) {
    const apiMetrics = metrics();
    app.use(apiMetrics.middleware);
    app.get('/metrics', apiMetrics.handler);
  }

  app.get('/api/v1', (req, res) => {
    res.json({ service: 'RemoteBPO Hub API', version: 1 });
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large' });
    }
    logger.error({ errorName: err.name, requestId: req.id }, 'Unhandled API error');
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
