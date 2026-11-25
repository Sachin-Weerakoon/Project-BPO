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

function buildApp(logger, checks = { db: async () => true }) {
  const app = express();
  app.use(express.json());
  app.use(requestLogger(logger));
  app.use(healthRouter(checks, { logger }));
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
  logger.info({ user: { password: 'x1', token: 't1', email: 'a@b.c' }, candidateId: '3f6c9b2e' }, 'profile updated');
  assert.equal(lines[0].user.password, '[REDACTED]');
  assert.equal(lines[0].user.token, '[REDACTED]');
  assert.equal(lines[0].user.email, '[REDACTED]');
  assert.equal(lines[0].candidateId, '3f6c9b2e');
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
  const ok = await start(buildApp(logger, { db: async () => true, redis: async () => true }));
  const bad = await start(
    buildApp(logger, {
      db: async () => true,
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
  assert.deepEqual(await r1.json(), { status: 'ready', checks: { db: 'up', redis: 'up' } });
  assert.equal(r2.status, 503);
  assert.deepEqual(await r2.json(), { status: 'not ready', checks: { db: 'up', redis: 'down' } });
});

test('warns at startup when /ready has no checks, not when it has some', () => {
  const none = captureLogger();
  healthRouter({}, { logger: none.logger });
  assert.equal(none.lines.length, 1);
  assert.equal(none.lines[0].level, 'warn');
  assert.match(none.lines[0].msg, /without readiness checks/);

  const some = captureLogger();
  healthRouter({ db: async () => true }, { logger: some.logger });
  assert.equal(some.lines.length, 0);
});

test('each field appears once per line, with the final status (no duplicate keys)', async () => {
  const raw = [];
  const destination = new Writable({
    write(chunk, _enc, cb) {
      raw.push(...chunk.toString().trim().split('\n'));
      cb();
    },
  });
  const logger = createLogger({ level: 'debug', destination });
  const app = express();
  app.use(requestLogger(logger));
  app.use((req, res, next) => {
    req.user = { id: 'u-42', role: 'candidate' }; // set later in the request, like auth does
    next();
  });
  app.get('/ok', (req, res) => res.json({}));
  app.get('/missing', (req, res) => res.status(404).json({}));
  app.get('/boom', () => {
    throw new Error('boom');
  });
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: 'internal' }));
  const { server, url } = await start(app);
  await fetch(`${url}/ok`);
  await fetch(`${url}/missing`);
  await fetch(`${url}/boom`);
  server.close();

  const lines = raw.filter((l) => l.includes('"requestId"'));
  assert.equal(lines.length, 3);
  for (const key of ['requestId', 'method', 'path', 'status', 'userId']) {
    for (const line of lines) {
      assert.equal(line.split(`"${key}":`).length - 1, 1, `${key} must appear once: ${line}`);
    }
  }
  const parsed = lines.map((l) => JSON.parse(l));
  assert.deepEqual(parsed.map((l) => l.status), [200, 404, 500]);
  assert.deepEqual(parsed.map((l) => l.level), ['info', 'warn', 'error']);
  assert.ok(parsed.every((l) => l.userId === 'u-42' && l.role === 'candidate'));
});
