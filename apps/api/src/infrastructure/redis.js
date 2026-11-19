'use strict';

const { createClient } = require('redis');

function createRedisClient(url, logger) {
  const client = createClient({ url });
  client.on('error', (error) => {
    logger.error({ errorName: error.name }, 'Redis client error');
  });
  return client;
}

async function connectRedis(client) {
  await client.connect();
  return client;
}

async function disconnectRedis(client) {
  if (client.isOpen) {
    await client.quit();
  }
}

module.exports = { createRedisClient, connectRedis, disconnectRedis };
