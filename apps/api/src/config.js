'use strict';

const { z } = require('zod');

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  MONGODB_URI: z.string().url().refine(
    (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
    'must use mongodb:// or mongodb+srv://',
  ),
  REDIS_URL: z.string().url().refine(
    (value) => value.startsWith('redis://') || value.startsWith('rediss://'),
    'must use redis:// or rediss://',
  ),
  CORS_ORIGIN: z.string().default('http://localhost:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.string().url()).min(1)),
  METRICS_ENABLED: z.enum(['true', 'false']).default('false'),
  GIT_SHA: z.string().optional(),
});

function loadConfig(env = process.env) {
  const parsed = environmentSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid API configuration: ${details}`);
  }

  const { CORS_ORIGIN, METRICS_ENABLED, ...config } = parsed.data;
  return {
    ...config,
    corsOrigins: CORS_ORIGIN,
    metricsEnabled: METRICS_ENABLED === 'true',
  };
}

module.exports = { loadConfig };
