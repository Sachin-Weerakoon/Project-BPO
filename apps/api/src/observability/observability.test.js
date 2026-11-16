'use strict';

// Run: node --test src/observability
const test = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const express = require('express');
const { createLogger } = require('./logger');
const { requestLogger } = require('./requestLogger');
const { healthRouter } = require('./health');

function captureLogger() {
  const lines = [];
  const destination = new Writable({
    write(chunk, _enc, cb) {
      chunk.toString().trim().split('\n').forEach((l) => lines.push(JSON.parse(l)));
      cb();
    },
  });
  return { logger: createLogger({ level: 'debug', destination }), lines };
}

async function start(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

function buildApp(logger, checks) {
  const app = express();
  app.use(express.json());
  app.use(requestLogger(logger));
  app.use(healthRouter(checks));
  app.post('/api/v1/login', (req, res) => res.status(401).json({ error: 'invalid' }));
  app.get('/api/v1/jobs', (req, res) => res.json([]));
  app.get('/boom', () => {
    throw new Error('boom');
  });
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: 'internal' }));
  return app;
}

test('logs one JSON line per request with the standard fields', async () => {
  const { logger, lines } = captureLogger();
  const { server, url } = await start(buildApp(logger));
  const res = await fetch(`${url}/api/v1/jobs?q=secret-search`);
  server.close();

  assert.equal(res.status, 200);
  const line = lines.find((l) => l.msg === 'request completed');
  assert.ok(line);
  for (const f of ['time', 'level', 'service', 'env', 'requestId', 'method', 'path', 'status', 'durationMs']) {
    assert.ok(f in line, `missing ${f}`);
  }
  assert.equal(line.level, 'info');
  assert.equal(line.path, '/api/v1/jobs'); // no query string
  assert.equal(line.status, 200);
  assert.equal(res.headers.get('x-request-id'), line.requestId);
});

test('reuses a safe X-Request-Id and replaces an unsafe one', async () => {
  const { logger, lines } = captureLogger();
  const { server, url } = await start(buildApp(logger));
  const a = await fetch(`${url}/api/v1/jobs`, { headers: { 'X-Request-Id': 'abc-123' } });
  const b = await fetch(`${url}/api/v1/jobs`, { headers: { 'X-Request-Id': 'bad id <script>' } });
  server.close();

  assert.equal(a.headers.get('x-request-id'), 'abc-123');
  assert.notEqual(b.headers.get('x-request-id'), 'bad id <script>');
  assert.match(b.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
  assert.equal(lines.filter((l) => l.msg === 'request completed').length, 2);
});

test('never logs passwords, tokens, cookies or request bodies', async () => {
  const { logger, lines } = captureLogger();
  const { server, url } = await start(buildApp(logger));
  await fetch(`${url}/api/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer eyJhbGciOi.secret', Cookie: 'refresh=topsecret' },
    body: JSON.stringify({ email: 'person@example.com', password: 'Sup3rSecret!' }),
  });
  server.close();

  const all = JSON.stringify(lines);
  for (const s of ['Sup3rSecret!', 'person@example.com', 'eyJhbGciOi', 'topsecret']) {
    assert.ok(!all.includes(s), `leaked ${s}`);
  }
  assert.equal(lines.at(-1).level, 'warn'); // 4xx
});

test('logs 5xx as error', async () => {
  const { logger, lines } = captureLogger();
  const { server, url } = await start(buildApp(logger));
  await fetch(`${url}/boom`);
  server.close();
  assert.equal(lines.at(-1).level, 'error');
  assert.equal(lines.at(-1).status, 500);
});

test('logger redacts secret fields in normal log calls', () => {
  const { logger, lines } = captureLogger();
  logger.info({ user: { password: 'x1', token: 't1', email: 'a@b.c' }, candidateId: '665f' }, 'profile updated');
  assert.equal(lines[0].user.password, '[REDACTED]');
  assert.equal(lines[0].user.token, '[REDACTED]');
  assert.equal(lines[0].user.email, '[REDACTED]');
  assert.equal(lines[0].candidateId, '665f');
});

test('/health returns ok and is logged at debug', async () => {
  const { logger, lines } = captureLogger();
  const { server, url } = await start(buildApp(logger));
  const res = await fetch(`${url}/health`);
  server.close();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
  assert.equal(lines.at(-1).level, 'debug');
});

test('/ready returns 200 when all checks pass and 503 when one fails', async () => {
  const { logger } = captureLogger();
  const ok = await start(buildApp(logger, { mongo: async () => true, redis: async () => true }));
  const bad = await start(
    buildApp(logger, {
      mongo: async () => true,
      redis: async () => {
        throw new Error('ECONNREFUSED');
      },
    }),
  );
  const r1 = await fetch(`${ok.url}/ready`);
  const r2 = await fetch(`${bad.url}/ready`);
  ok.server.close();
  bad.server.close();

  assert.equal(r1.status, 200);
  assert.deepEqual(await r1.json(), { status: 'ready', checks: { mongo: 'up', redis: 'up' } });
  assert.equal(r2.status, 503);
  assert.deepEqual(await r2.json(), { status: 'not ready', checks: { mongo: 'up', redis: 'down' } });
});
