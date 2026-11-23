'use strict';

// Stops the seed script from writing fake data into the wrong database. Guide: docs/seed-data.md
const LOCAL_HOSTS = /^mongodb:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|mongo|mongodb)(:\d+)?(\/|$)/;

function assertSafeToSeed({ env = process.env } = {}) {
  const nodeEnv = env.NODE_ENV || 'development';
  const uri = env.MONGODB_URI || '';

  if (!uri) {
    throw new Error('MONGODB_URI is not set.');
  }
  // Staging runs with NODE_ENV=production too, so it must say SEED_ENV=staging on purpose
  if (nodeEnv === 'production' && env.SEED_ENV !== 'staging') {
    throw new Error('Refusing to seed: NODE_ENV=production. For staging set SEED_ENV=staging (fake data only).');
  }
  const local = LOCAL_HOSTS.test(uri);   // mongodb+srv:// (Atlas) is always remote
  if (!local && env.SEED_ALLOW_REMOTE !== 'yes') {
    throw new Error('Refusing to seed a remote database (e.g. Atlas). Set SEED_ALLOW_REMOTE=yes only for staging.');
  }
  return { target: local ? 'local' : 'remote' };
}

module.exports = { assertSafeToSeed };
