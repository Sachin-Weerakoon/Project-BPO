# Seed data (fake data for local and staging)

- **Owner:** Suvethica (DevOps, Days 5-6), with Sathsarani (models)
- **Status:** v1. For the MongoDB + Mongoose baseline (ADR 0003).
- **Code:** [`apps/api/src/seed/`](../apps/api/src/seed/)

## 1. Rules

1. **Fake data only.** No real candidates, employers, emails, phone numbers or CVs, in any environment (SRS: staging uses synthetic data).
2. All seed emails end with **`@seed.remotebpo.test`** (`.test` can never be a real domain).
3. **Never** run the seed against production. The script refuses when:
   - `NODE_ENV=production` (unless `SEED_ENV=staging` is set on purpose)
   - the database is not local (any `mongodb+srv://` / Atlas URI) unless `SEED_ALLOW_REMOTE=yes`
4. The seed is **repeatable**: the same `SEED` number always gives the same data and the same ids,
   so running it twice updates the same documents instead of creating duplicates.
5. `--reset` deletes **only** the seed documents (by their ids). Real documents are never touched.
6. No passwords in seed data. When login exists, the seed sets one shared **local dev password** from an env variable, hashed by the same code as real users.

## 2. What it creates (default)

| Collection | Count | Notes |
|---|---|---|
| `users` | 36 | 1 admin, 5 employers, 30 candidates |
| `companies` | 5 | 3 verified, 2 pending (admin queue) |
| `jobs` | 20 | mostly published; some draft, paused, closed. BPO process types, languages, shifts, tools, salary |
| `candidateprofiles` | 30 | languages + proficiency, tools, typing speed, remote setup |
| `applications` | about 40 | only to published jobs, one per candidate per job (FR-104), all pipeline statuses |

Change the amounts with `SEED_CANDIDATES`, `SEED_EMPLOYERS`, `SEED_JOBS_PER_COMPANY`, and the data with `SEED`.

## 3. How to run (in `apps/api`)

```bash
node src/seed/run.js            # add or update the seed data
node src/seed/run.js --reset    # remove the seed data
SEED=7 SEED_CANDIDATES=100 node src/seed/run.js
```

It reads `MONGODB_URI` from the root `.env` (local default: `mongodb://127.0.0.1:27017/remotebpo`).
Suggested `package.json` scripts: `"seed": "node src/seed/run.js"`, `"seed:reset": "node src/seed/run.js --reset"`.

Staging (only with the team's OK, fake data only):

```bash
NODE_ENV=production SEED_ENV=staging SEED_ALLOW_REMOTE=yes MONGODB_URI=<staging uri> node src/seed/run.js
```

## 4. For the models (Sathsarani)

- Collection names follow Mongoose defaults for the planned models (`User` -> `users`, `CandidateProfile` -> `candidateprofiles` ...).
  If a model uses another name or field, change `COLLECTIONS` in `run.js` or the field in `fakeData.js`.
- Field names are camelCase and ids are ObjectIds (`ownerId`, `companyId`, `userId`, `jobId`, `candidateId`), dates are real `Date` values.
- The seed writes with the MongoDB driver (no model validation), so after the models exist, add a test that loads
  every seed document into its model and calls `validate()`. That keeps seed data and models in step.

## 5. Tests

```bash
node --test src/seed/seed.test.js                                                   # data + safety rules
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/seed_test node --test src/seed/seed.test.js   # + real database test
```

Checks: same seed = same data, only fake emails, unique emails/slugs/ids, no duplicate applications,
applications only to published jobs, links between documents, the safety guard, running twice does not
duplicate, and `--reset` keeps real documents. Tested on MongoDB 8.
