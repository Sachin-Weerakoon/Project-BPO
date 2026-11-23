'use strict';

// Seed the database with fake data. Guide: docs/seed-data.md
//   node src/seed/run.js            insert or update the seed documents (safe to run again)
//   node src/seed/run.js --reset    delete the seed documents only (real documents are not touched)
//   SEED=7 SEED_CANDIDATES=100 node src/seed/run.js
const path = require('node:path');
const mongoose = require('mongoose');
const { makeSeedData } = require('./fakeData');
const { assertSafeToSeed } = require('./guard');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../..', '.env') });
} catch {
  // dotenv is optional
}

// Collection names follow Mongoose's default for the planned models
// (User -> users, CandidateProfile -> candidateprofiles ...). Change here if the models use other names.
const COLLECTIONS = {
  users: 'users',
  companies: 'companies',
  candidateProfiles: 'candidateprofiles',
  jobs: 'jobs',
  applications: 'applications',
};
const ID_FIELDS = ['_id', 'ownerId', 'companyId', 'userId', 'jobId', 'candidateId'];
const DATE_FIELDS = ['createdAt', 'publishedAt', 'expiresAt'];

function toMongo(doc) {
  const out = { ...doc };
  for (const f of ID_FIELDS) if (out[f]) out[f] = new mongoose.Types.ObjectId(out[f]);
  for (const f of DATE_FIELDS) if (out[f]) out[f] = new Date(out[f]);
  out.updatedAt = out.createdAt;
  return out;
}

async function seed({ uri, reset = false, options = {}, log = console.log } = {}) {
  const data = makeSeedData(options);
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    const summary = {};
    for (const [key, name] of Object.entries(COLLECTIONS)) {
      const docs = data[key].map(toMongo);
      const col = conn.collection(name);
      if (reset) {
        const r = await col.deleteMany({ _id: { $in: docs.map((d) => d._id) } });
        summary[name] = { deleted: r.deletedCount };
      } else if (docs.length) {
        // Upsert by _id: running the seed twice does not create duplicates
        const r = await col.bulkWrite(docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })));
        summary[name] = { inserted: r.upsertedCount, updated: r.modifiedCount };
      }
    }
    log(JSON.stringify({ msg: reset ? 'seed data removed' : 'seed data written', summary }));
    return summary;
  } finally {
    await conn.close();
  }
}

if (require.main === module) {
  let target;
  try {
    ({ target } = assertSafeToSeed());
  } catch (err) {
    console.error(JSON.stringify({ msg: 'seed refused', error: err.message }));
    process.exit(1);
  }
  const num = (v, d) => (v ? Number(v) : d);
  seed({
    uri: process.env.MONGODB_URI,
    reset: process.argv.includes('--reset'),
    options: {
      seed: num(process.env.SEED, 42),
      candidates: num(process.env.SEED_CANDIDATES, 30),
      employers: num(process.env.SEED_EMPLOYERS, 5),
      jobsPerCompany: num(process.env.SEED_JOBS_PER_COMPANY, 4),
    },
  })
    .then(() => console.log(JSON.stringify({ msg: 'done', target })))
    .catch((err) => {
      console.error(JSON.stringify({ msg: 'seed failed', error: err.message }));
      process.exitCode = 1;
    });
}

module.exports = { seed, COLLECTIONS };
