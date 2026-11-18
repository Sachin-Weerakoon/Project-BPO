#!/usr/bin/env bash
# Restore test: take a backup, decrypt it, restore it into an EMPTY test database, run smoke checks.
# Runbook: docs/runbooks/backup-restore.md
#
# Usage: pg-restore-test.sh [backup file name or path]   (default: latest in BACKUP_DEST/daily)
#
# Required env:
#   RESTORE_DATABASE_URL  an EMPTY test database (never staging or production)
#   BACKUP_AGE_IDENTITY   path to the age private key file
#   BACKUP_DEST           s3://bucket/prefix  or  /local/dir
# Optional env:
#   S3_ENDPOINT           S3-compatible endpoint
#   SMOKE_SQL             file with extra checks: one query per line, each must return true (t)
#   RESTORE_ALLOW_REMOTE  set to "yes" to allow a target that is not localhost
set -euo pipefail
umask 077

log() { printf '{"time":"%s","level":"%s","service":"restore-test","msg":"%s"%s}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" "${3:-}"; }
fail() { log error "$1"; exit 1; }

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${BACKUP_AGE_IDENTITY:?BACKUP_AGE_IDENTITY is required}"
: "${BACKUP_DEST:?BACKUP_DEST is required}"
[ -r "$BACKUP_AGE_IDENTITY" ] || fail "cannot read BACKUP_AGE_IDENTITY file"
for cmd in pg_restore psql age sha256sum; do command -v "$cmd" >/dev/null || fail "missing command: $cmd"; done

# Safety: only restore into a local test database unless told otherwise
case "$RESTORE_DATABASE_URL" in
  *@localhost[:/]*|*@127.0.0.1[:/]*|*@localhost|*@127.0.0.1|postgresql:///*|postgres:///*) ;;
  *) [ "${RESTORE_ALLOW_REMOTE:-}" = "yes" ] || fail "target is not localhost; set RESTORE_ALLOW_REMOTE=yes if you are sure" ;;
esac

PSQL=(psql --dbname="$RESTORE_DATABASE_URL" -X -q -t -A -v ON_ERROR_STOP=1)
TABLES=$("${PSQL[@]}" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
[ "$TABLES" = "0" ] || fail "target database is not empty ($TABLES tables in public). Use a fresh database"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
EP=(); [ -n "${S3_ENDPOINT:-}" ] && EP=(--endpoint-url "$S3_ENDPOINT")

# 1. Find the backup
FILE="${1:-}"
case "$BACKUP_DEST" in
  s3://*)
    command -v aws >/dev/null || fail "missing command: aws"
    if [ -z "$FILE" ]; then
      FILE=$(aws "${EP[@]}" s3 ls "${BACKUP_DEST%/}/daily/" | awk '{print $4}' | grep '\.dump\.age$' | sort | tail -1)
    fi
    FILE="$(basename "$FILE")"
    [ -n "$FILE" ] || fail "no backup found"
    folder=daily; [ -n "${1:-}" ] && case "$1" in weekly/*) folder=weekly;; esac
    aws "${EP[@]}" s3 cp --only-show-errors "${BACKUP_DEST%/}/$folder/$FILE" "$WORK/$FILE"
    aws "${EP[@]}" s3 cp --only-show-errors "${BACKUP_DEST%/}/$folder/$FILE.sha256" "$WORK/$FILE.sha256" ;;
  *)
    if [ -z "$FILE" ]; then
      FILE=$(ls -1 "$BACKUP_DEST/daily/" 2>/dev/null | grep '\.dump\.age$' | sort | tail -1 || true)
      [ -n "$FILE" ] || fail "no backup found"
      FILE="$BACKUP_DEST/daily/$FILE"
    elif [ ! -f "$FILE" ]; then
      FILE="$BACKUP_DEST/$FILE"
    fi
    [ -f "$FILE" ] || fail "backup file not found"
    cp "$FILE" "$FILE.sha256" "$WORK/"
    FILE="$(basename "$FILE")" ;;
esac
log info "restore test started" ",\"file\":\"$FILE\""

# 2. Check the file was not changed or cut short
(cd "$WORK" && sha256sum --check --quiet "$FILE.sha256") || fail "checksum does not match"

# 3. Decrypt and restore (stream, no plain dump on disk)
#    The dump creates schema "public", which every new database already has: skip that entry.
age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$WORK/$FILE" | pg_restore --list \
  | grep -v -E '^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public ' > "$WORK/restore.list" \
  || fail "decrypt failed (wrong key or damaged file)"
age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$WORK/$FILE" \
  | pg_restore --dbname="$RESTORE_DATABASE_URL" --use-list="$WORK/restore.list" \
      --no-owner --no-privileges --exit-on-error \
  || fail "restore failed"

# 4. Smoke checks
TABLES=$("${PSQL[@]}" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
[ "$TABLES" -gt 0 ] || fail "no tables after restore"

"${PSQL[@]}" -c "ANALYZE" >/dev/null
echo "Row counts (estimated, after ANALYZE):"
"${PSQL[@]}" -F $'\t' -c "SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY relname" \
  | awk -F'\t' '{printf "  %-30s %s\n", $1, $2}'

FAILED=0
if [ -n "${SMOKE_SQL:-}" ]; then
  while IFS= read -r q; do
    case "$q" in ''|--*) continue;; esac
    r=$("${PSQL[@]}" -c "$q" 2>/dev/null || echo error)
    if [ "$r" = "t" ]; then echo "  PASS  $q"; else echo "  FAIL  $q"; FAILED=$((FAILED+1)); fi
  done < "$SMOKE_SQL"
fi
[ "$FAILED" -eq 0 ] || fail "$FAILED smoke check(s) failed"

log info "restore test passed" ",\"file\":\"$FILE\",\"tables\":$TABLES"
