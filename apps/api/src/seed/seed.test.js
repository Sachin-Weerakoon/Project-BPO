'use strict';

// Run: node --test src/seed/seed.test.js
// Database test runs only when MONGODB_URI_TEST points to a local, throwaway MongoDB.
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeSeedData, PROCESS_TYPES } = require('./fakeData');
const { assertSafeToSeed } = require('./guard');

test('same seed gives the same data, another seed gives different data', () => {
  assert.deepEqual(makeSeedData({ seed: 7 }), makeSeedData({ seed: 7 }));
  assert.notDeepEqual(makeSeedData({ seed: 7 }), makeSeedData({ seed: 8 }));
});

test('creates the requested amounts', () => {
  const d = makeSeedData({ candidates: 20, employers: 3, jobsPerCompany: 5 });
  assert.equal(d.users.length, 1 + 3 + 20);
  assert.equal(d.companies.length, 3);
  assert.equal(d.jobs.length, 15);
  assert.equal(d.candidateProfiles.length, 20);
});

test('only fake emails; unique emails, slugs and MongoDB-style ids', () => {
  const d = makeSeedData({ candidates: 100, employers: 10 });
  assert.ok(d.users.every((u) => u.email.endsWith('@seed.remotebpo.test')));
  const unique = (list) => new Set(list).size === list.length;
  assert.ok(unique(d.users.map((u) => u.email.toLowerCase())));
  assert.ok(unique(d.jobs.map((j) => j.slug)));
  assert.ok(unique(d.companies.map((c) => c.slug)));
  const ids = [...d.users, ...d.companies, ...d.jobs, ...d.candidateProfiles, ...d.applications].map((x) => x._id);
  assert.ok(unique(ids));
  assert.ok(ids.every((id) => /^[0-9a-f]{24}$/.test(id)));
});

test('follows the business rules', () => {
  const d = makeSeedData({ candidates: 100, employers: 10 });
  const jobs = new Map(d.jobs.map((j) => [j._id, j]));
  const pairs = d.applications.map((a) => `${a.jobId}:${a.candidateId}`);
  assert.equal(new Set(pairs).size, pairs.length, 'no duplicate applications (FR-104)');
  assert.ok(d.applications.every((a) => jobs.get(a.jobId)?.status === 'published'), 'only published jobs get applications');
  assert.ok(d.jobs.every((j) => PROCESS_TYPES.includes(j.processType)));
  assert.ok(d.jobs.every((j) => j.salaryMax > j.salaryMin));
  assert.ok(d.jobs.every((j) => (j.status === 'draft') === (j.publishedAt === null)));
  const companies = new Set(d.companies.map((c) => c._id));
  assert.ok(d.jobs.every((j) => companies.has(j.companyId)));
  const candidates = new Set(d.users.filter((u) => u.role === 'candidate').map((u) => u._id));
  assert.ok(d.applications.every((a) => candidates.has(a.candidateId)));
});

test('guard: allows local MongoDB, refuses production and Atlas', () => {
  const ok = (env) => assertSafeToSeed({ env });
  assert.deepEqual(ok({ MONGODB_URI: 'mongodb://127.0.0.1:27017/remotebpo' }), { target: 'local' });
  assert.deepEqual(ok({ MONGODB_URI: 'mongodb://localhost/remotebpo' }), { target: 'local' });
  assert.deepEqual(ok({ MONGODB_URI: 'mongodb://user:pw@mongo:27017/remotebpo' }), { target: 'local' });
  const atlas = 'mongodb+srv://user:pw@cluster0.abcde.mongodb.net/remotebpo';
  assert.throws(() => ok({}), /not set/);
  assert.throws(() => ok({ MONGODB_URI: atlas }), /remote/);
  assert.throws(() => ok({ MONGODB_URI: 'mongodb://localhost.evil.com/x' }), /remote/);
  assert.throws(() => ok({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1/x' }), /production/);
  assert.throws(() => ok({ NODE_ENV: 'production', MONGODB_URI: atlas, SEED_ALLOW_REMOTE: 'yes' }), /production/);
  assert.deepEqual(ok({ NODE_ENV: 'production', SEED_ENV: 'staging', MONGODB_URI: atlas, SEED_ALLOW_REMOTE: 'yes' }), { target: 'remote' });
});

test('writes to MongoDB, can run twice, reset removes only seed data', { skip: !process.env.MONGODB_URI_TEST }, async () => {
  const mongoose = require('mongoose');
  const { seed } = require('./run');
  const uri = process.env.MONGODB_URI_TEST;
  const quiet = () => {};
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    await conn.dropDatabase();
    await conn.collection('users').insertOne({ email: 'real.user@example.com', role: 'candidate' });

    const first = await seed({ uri, options: { candidates: 10, employers: 2 }, log: quiet });
    assert.equal(first.users.inserted, 13);
    const second = await seed({ uri, options: { candidates: 10, employers: 2 }, log: quiet });
    assert.equal(second.users.inserted, 0, 'second run must not duplicate');
    assert.equal(await conn.collection('users').countDocuments(), 14);

    const job = await conn.collection('jobs').findOne({ status: 'published' });
    assert.ok(job._id instanceof mongoose.Types.ObjectId && job.companyId instanceof mongoose.Types.ObjectId);
    assert.ok(job.publishedAt instanceof Date);

    await seed({ uri, reset: true, options: { candidates: 10, employers: 2 }, log: quiet });
    assert.equal(await conn.collection('users').countDocuments(), 1, 'only the real user is left');
    assert.equal(await conn.collection('jobs').countDocuments(), 0);
  } finally {
    await conn.dropDatabase();
    await conn.close();
  }
});
