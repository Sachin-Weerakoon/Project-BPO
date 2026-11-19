'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../..', '.env') });

const { loadConfig } = require('./config');
const { createApp } = require('./app');
const { logger } = require('./observability/logger');
const { connectMongo, disconnectMongo, isMongoReady } = require('./infrastructure/mongo');
const { createRedisClient, connectRedis, disconnectRedis } = require('./infrastructure/redis');

async function startServer() {
  const config = loadConfig();
  await connectMongo(config.MONGODB_URI);

  const redis = createRedisClient(config.REDIS_URL, logger);
  try {
    await connectRedis(redis);
  } catch (error) {
    await disconnectMongo();
    throw error;
  }

  const app = createApp({
    corsOrigins: config.corsOrigins,
    metricsEnabled: config.metricsEnabled,
    readinessChecks: {
      db: async () => isMongoReady(),
      redis: async () => (await redis.ping()) === 'PONG',
    },
  });
  const server = app.listen(config.API_PORT, () => {
    logger.info({ port: config.API_PORT }, 'RemoteBPO Hub API listening');
  });

  let stopping = false;
  async function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'API shutdown started');
    server.close(async (error) => {
      try {
        if (error) throw error;
        await disconnectRedis(redis);
        await disconnectMongo();
        logger.info('API shutdown complete');
      } catch (shutdownError) {
        logger.error({ errorName: shutdownError.name }, 'API shutdown failed');
        process.exitCode = 1;
      }
    });
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  logger.fatal({ errorName: error.name }, 'API startup failed');
  process.exitCode = 1;
});
