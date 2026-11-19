'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');
const { createLogger } = require('./observability/logger');

test('serves API and health routes with security and request ID headers', async (t) => {
  const logger = createLogger({ level: 'silent' });
  const app = createApp({
    corsOrigins: ['http://localhost:3000'],
    readinessChecks: { db: async () => true },
    logger,
  });
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  const apiResponse = await fetch(`${url}/api/v1`);
  assert.equal(apiResponse.status, 200);
  assert.deepEqual(await apiResponse.json(), { service: 'RemoteBPO Hub API', version: 1 });
  assert.ok(apiResponse.headers.get('x-request-id'));
  assert.ok(apiResponse.headers.get('x-content-type-options'));

  const healthResponse = await fetch(`${url}/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: 'ok' });
});

test('returns a client error for malformed JSON', async (t) => {
  const app = createApp({
    readinessChecks: { db: async () => true },
    logger: createLogger({ level: 'silent' }),
  });
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON body' });
});
