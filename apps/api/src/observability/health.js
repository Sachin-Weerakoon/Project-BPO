'use strict';

// GET /health (process is up) and GET /ready (dependencies are up). Plan: docs/monitoring.md
const express = require('express');

/**
 * @param {object} [checks] name -> async function that returns true when healthy
 *   e.g. { mongo: async () => mongoose.connection.readyState === 1 }
 */
function healthRouter(checks = {}) {
  const router = express.Router();
  const version = process.env.GIT_SHA ? process.env.GIT_SHA.slice(0, 7) : undefined;

  router.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok', version });
  });

  router.get('/ready', async (req, res) => {
    const results = {};
    await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        try {
          results[name] = (await withTimeout(check(), 2000)) ? 'up' : 'down';
        } catch {
          results[name] = 'down';
        }
      }),
    );
    const ready = Object.values(results).every((r) => r === 'up');
    res
      .status(ready ? 200 : 503)
      .set('Cache-Control', 'no-store')
      .json({ status: ready ? 'ready' : 'not ready', checks: results });
  });

  return router;
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

module.exports = { healthRouter };
