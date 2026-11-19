# Backup image for the Kubernetes CronJob. pg_dump must be the SAME or NEWER major version than the
# database server: check Supabase (Project Settings -> Infrastructure) and change 17 if needed.
FROM postgres:17-alpine
RUN apk add --no-cache bash age aws-cli curl
COPY pg-backup.sh pg-restore-test.sh /usr/local/bin/
COPY smoke-checks.sql /usr/local/share/backup/smoke-checks.sql
# built-in "postgres" user (uid 70), not root
USER 70
ENTRYPOINT ["/usr/local/bin/pg-backup.sh"]
