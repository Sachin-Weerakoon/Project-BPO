# MongoDB index guide (for the models)

- **Owner:** Sathsarani (models), Suvethica (support, Day 3-4)
- **Status:** v1 suggestion. Based on SRS Part C. Adjust names to the real model fields.

## 1. Rules

1. Index the fields we **filter or sort on often**. Not every field.
2. Compound index order: **equality fields first, then sort field, then range** (ESR rule).
3. Unique indexes protect business rules (one email per user, one application per job per candidate).
4. Max ~5-6 indexes per collection: each index slows writes and uses Atlas Free storage (512 MB).
5. In production, `autoIndex: false` and indexes are created with `Model.syncIndexes()` in a deploy step.
   Local: `autoIndex` on is fine.
6. Check a slow query with `.explain('executionStats')`: we want `IXSCAN`, not `COLLSCAN`.

## 2. Suggested indexes

### User (FR-001 to FR-006)

```js
userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } }); // case-insensitive unique
userSchema.index({ role: 1, createdAt: -1 });                                              // admin lists
```

Store reset / verify tokens **hashed**. If they live in their own collection, expire them automatically:

```js
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });   // TTL: Mongo deletes expired tokens
tokenSchema.index({ tokenHash: 1 }, { unique: true });
```

### CandidateProfile (FR-020 to FR-022)

```js
candidateProfileSchema.index({ user: 1 }, { unique: true });             // one profile per user
candidateProfileSchema.index({ 'languages.code': 1 });                   // employer search by language
candidateProfileSchema.index({ timezone: 1 });
```

### Company (FR-040, FR-041, FR-160)

```js
companySchema.index({ slug: 1 }, { unique: true });                      // public company page
companySchema.index({ owner: 1 });
companySchema.index({ verificationStatus: 1, createdAt: -1 });           // admin verification queue
```

### Job (FR-060 to FR-063, FR-080, FR-081)

```js
// Main search: published jobs, filter by process type, newest first
jobSchema.index({ status: 1, processType: 1, publishedAt: -1 });
// Filter by language and shift
jobSchema.index({ status: 1, 'languages.code': 1, publishedAt: -1 });
jobSchema.index({ status: 1, shift: 1, publishedAt: -1 });
// Employer dashboard
jobSchema.index({ company: 1, status: 1, createdAt: -1 });
// Keyword search (one text index per collection)
jobSchema.index({ title: 'text', description: 'text', tools: 'text' },
                { weights: { title: 5, tools: 3, description: 1 }, name: 'job_text' });
jobSchema.index({ slug: 1 }, { unique: true });                          // SEO job page
```

Job expiry (FR-063): **do not** use a TTL index on jobs (TTL deletes documents). Use a daily job that sets
`status: 'archived'` where `expiresAt < now`, supported by `{ status: 1, expiresAt: 1 }`.

### Application (FR-100 to FR-104)

```js
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });     // FR-104: no duplicate applications
applicationSchema.index({ candidate: 1, createdAt: -1 });                // candidate dashboard
applicationSchema.index({ job: 1, status: 1, createdAt: -1 });           // employer pipeline per job
```

The unique index is the real protection against double clicks. The API should catch error code `11000` and return `409 Conflict`.

### Later collections (Cycle 4)

```js
savedJobSchema.index({ user: 1, job: 1 }, { unique: true });
messageSchema.index({ application: 1, createdAt: 1 });                   // chat thread
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
```

## 3. Checklist for the models PR

- [ ] Unique: `User.email`, `CandidateProfile.user`, `Company.slug`, `Job.slug`, `Application(job, candidate)`
- [ ] Duplicate key error `11000` handled (409)
- [ ] Search queries use the compound indexes (check with `.explain()`)
- [ ] No index on fields we never query
