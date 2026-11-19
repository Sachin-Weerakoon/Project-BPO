'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('./config');

const validEnvironment = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/remotebpo',
  REDIS_URL: 'redis://127.0.0.1:6379',
};

test('loads defaults and normalizes comma-separated CORS origins', () => {
  const config = loadConfig({
    ...validEnvironment,
    CORS_ORIGIN: 'http://localhost:3000, https://staging.example.com',
  });

  assert.equal(config.API_PORT, 5000);
  assert.equal(config.metricsEnabled, false);
  assert.deepEqual(config.corsOrigins, [
    'http://localhost:3000',
    'https://staging.example.com',
  ]);
});

test('rejects missing and malformed service configuration', () => {
  assert.throws(() => loadConfig({}), /MONGODB_URI/);
  assert.throws(
    () => loadConfig({ ...validEnvironment, API_PORT: '70000' }),
    /API_PORT/,
  );
  assert.throws(
    () => loadConfig({ ...validEnvironment, REDIS_URL: 'https://redis.example.com' }),
    /REDIS_URL/,
  );
});
