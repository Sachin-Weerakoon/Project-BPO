# PostgreSQL index guide (for the database tables)

- **Owner:** Sathsarani (models and migrations), Suvethica (support, Days 3-4)
- **Status:** v3. The lead moved the database from MongoDB to **PostgreSQL** for scalability. Staging uses **Supabase** (managed PostgreSQL, ADR 0002 v3).
  Based on SRS Part C. Table and column names are suggestions: change them to match the real schema.
- SQL below is plain PostgreSQL, so it works with any tool (Prisma, Sequelize, Knex, TypeORM). Put it in **migrations**, never run it by hand on staging.

## 1. Rules

1. Primary keys and `UNIQUE` constraints get an index **automatically**.
2. **Foreign keys do not.** Add an index on every foreign key column we join or filter on (`company_id`, `job_id`, `candidate_id` …).
3. Composite index order: **equality columns first, then the sort column, then range columns**.
4. Use a **partial index** (`WHERE status = 'published'`) when most queries only read one status.
5. Use **GIN** indexes for full-text search, arrays and `jsonb`.
6. Don't add indexes "just in case": each index slows inserts and updates and uses disk.
7. Check slow queries with `EXPLAIN ANALYZE`: we want `Index Scan` / `Bitmap Index Scan`, not `Seq Scan` on big tables.
8. On tables that already have data in staging or production, create indexes with `CREATE INDEX CONCURRENTLY` so the table is not locked.
   It cannot run inside a transaction, so put it in its own migration (Prisma, Knex and others wrap migrations in a transaction by default).

## Supabase notes

- Run migrations with **`DATABASE_DIRECT_URL`** (direct connection). The pooler URL (`DATABASE_URL`, port 6543) is for the app, and it does not support migrations.
- Supabase Free has a database size limit: every index uses space, which is one more reason for rule 6.
- Slow queries and index usage are in the Supabase dashboard (**Query Performance**). Unused indexes can be found with:
  `SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0;`

## 2. Suggested indexes

### users (FR-001 to FR-006)

```sql
-- one account per email, case-insensitive (Test@x.com = test@x.com)
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
-- admin user lists
CREATE INDEX users_role_created_idx ON users (role, created_at DESC);
```

Email verification and password reset tokens: store only a **hash** of the token.
PostgreSQL has no TTL like MongoDB, so a daily job deletes expired rows.

```sql
CREATE UNIQUE INDEX auth_tokens_hash_unique ON auth_tokens (token_hash);
CREATE INDEX auth_tokens_expires_idx ON auth_tokens (expires_at);   -- for the cleanup job
-- cleanup job:  DELETE FROM auth_tokens WHERE expires_at < now();
```

### candidate_profiles (FR-020 to FR-022)

```sql
CREATE UNIQUE INDEX candidate_profiles_user_unique ON candidate_profiles (user_id);  -- one profile per user
CREATE INDEX candidate_profiles_timezone_idx ON candidate_profiles (timezone);
```

Languages and skills are lists. Two ways, pick one:

```sql
-- A) separate table (better for filters and proficiency levels)
CREATE TABLE candidate_languages (
  profile_id  uuid REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  language    text NOT NULL,
  proficiency text NOT NULL,
  PRIMARY KEY (profile_id, language)
);
CREATE INDEX candidate_languages_language_idx ON candidate_languages (language);

-- B) array column (simpler)
CREATE INDEX candidate_profiles_tools_gin ON candidate_profiles USING gin (tools);   -- WHERE tools @> ARRAY['Zendesk']
```

### companies (FR-040, FR-041, FR-160)

```sql
CREATE UNIQUE INDEX companies_slug_unique ON companies (slug);           -- public company page
CREATE INDEX companies_owner_idx ON companies (owner_id);
CREATE INDEX companies_pending_idx ON companies (created_at)             -- admin verification queue
  WHERE verification_status = 'pending';
```

### jobs (FR-060 to FR-063, FR-080, FR-081)

```sql
CREATE UNIQUE INDEX jobs_slug_unique ON jobs (slug);                     -- SEO job page
CREATE INDEX jobs_company_status_idx ON jobs (company_id, status, created_at DESC);  -- employer dashboard

-- Public search only reads published jobs: partial indexes stay small
CREATE INDEX jobs_published_process_idx ON jobs (process_type, published_at DESC)
  WHERE status = 'published';
CREATE INDEX jobs_published_shift_idx ON jobs (shift, published_at DESC)
  WHERE status = 'published';
CREATE INDEX jobs_published_salary_idx ON jobs (salary_min, salary_max)
  WHERE status = 'published';
CREATE INDEX jobs_languages_gin ON jobs USING gin (languages);           -- WHERE languages @> ARRAY['English']

-- Keyword search (FR-080): full-text column, title counts more than description
ALTER TABLE jobs ADD COLUMN search tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;
CREATE INDEX jobs_search_gin ON jobs USING gin (search);
-- query:  WHERE search @@ websearch_to_tsquery('english', 'zendesk night shift')
--         ORDER BY ts_rank(search, websearch_to_tsquery('english', 'zendesk night shift')) DESC

-- Job expiry (FR-063): daily job archives expired jobs
CREATE INDEX jobs_expiry_idx ON jobs (expires_at) WHERE status = 'published';
-- UPDATE jobs SET status = 'archived' WHERE status = 'published' AND expires_at < now();
```

Tools filter (Zendesk, Salesforce …) uses an array column with a GIN index:

```sql
CREATE INDEX jobs_tools_gin ON jobs USING gin (tools);                   -- WHERE tools @> ARRAY['Zendesk']
```

### applications (FR-100 to FR-104)

```sql
-- FR-104: no duplicate applications. This is the real protection against double clicks.
ALTER TABLE applications ADD CONSTRAINT applications_job_candidate_unique UNIQUE (job_id, candidate_id);
CREATE INDEX applications_candidate_idx ON applications (candidate_id, created_at DESC);     -- candidate dashboard
CREATE INDEX applications_job_status_idx ON applications (job_id, status, created_at DESC);  -- employer pipeline

-- FR-102: status history
CREATE INDEX application_status_history_app_idx ON application_status_history (application_id, created_at);
```

The API should catch PostgreSQL error code **`23505`** (unique violation) and return **`409 Conflict`**.

### Later tables (Cycle 4)

```sql
ALTER TABLE saved_jobs ADD PRIMARY KEY (user_id, job_id);
CREATE INDEX messages_application_idx ON messages (application_id, created_at);       -- chat thread
CREATE INDEX notifications_unread_idx ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_id, created_at DESC);
```

## 3. Checklist for the models PR

- [ ] Unique: `lower(users.email)`, `candidate_profiles.user_id`, `companies.slug`, `jobs.slug`, `applications(job_id, candidate_id)`
- [ ] Every foreign key column used in joins has an index
- [ ] Error `23505` returns 409
- [ ] Indexes are in migrations, not created by hand
- [ ] Search queries checked with `EXPLAIN ANALYZE`
