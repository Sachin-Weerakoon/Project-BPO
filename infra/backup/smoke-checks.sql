-- Restore smoke checks: one query per line, each must return true.
-- Update table names when the real schema exists (Sathsarani's migrations).
SELECT to_regclass('public.users') IS NOT NULL
SELECT (SELECT count(*) FROM users) > 0
SELECT to_regclass('public.jobs') IS NOT NULL
SELECT (SELECT count(*) FROM jobs) > 0
SELECT to_regclass('public.applications') IS NOT NULL
SELECT NOT EXISTS (SELECT 1 FROM applications a LEFT JOIN jobs j ON j.id = a.job_id WHERE j.id IS NULL)
SELECT (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') > 0
