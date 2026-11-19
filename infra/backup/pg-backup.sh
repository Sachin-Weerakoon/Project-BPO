#!/usr/bin/env bash
# Daily PostgreSQL backup: pg_dump -> encrypt with age -> upload. Runbook: docs/runbooks/backup-restore.md
#
# Required env:
#   DATABASE_DIRECT_URL   direct connection URL (NOT the pooler; pg_dump needs a session)
#   BACKUP_AGE_RECIPIENT  age public key (age1...). Only the matching private key can decrypt
#   BACKUP_DEST           s3://bucket/prefix  or  /local/dir
# Optional env:
#   S3_ENDPOINT           S3-compatible endpoint (Oracle Object Storage, MinIO ...)
#   BACKUP_SCHEMAS        schemas to dump, space separated (default: public)
#   BACKUP_HEARTBEAT_URL  pinged after a successful backup (e.g. healthchecks.io)
#   BACKUP_KEEP_DAILY / BACKUP_KEEP_WEEKLY  local dest only: days to keep (default 7 / 28)
set -euo pipefail
umask 077

log() { printf '{"time":"%s","level":"%s","service":"backup","msg":"%s"%s}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" "${3:-}"; }
fail() { log error "$1"; exit 1; }

: "${DATABASE_DIRECT_URL:?DATABASE_DIRECT_URL is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required}"
: "${BACKUP_DEST:?BACKUP_DEST is required}"
SCHEMAS="${BACKUP_SCHEMAS:-public}"

for cmd in pg_dump age sha256sum; do command -v "$cmd" >/dev/null || fail "missing command: $cmd"; done
case "$BACKUP_DEST" in s3://*) command -v aws >/dev/null || fail "missing command: aws";; esac

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="remotebpo-${STAMP}.dump.age"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

schema_args=()
for s in $SCHEMAS; do schema_args+=(--schema="$s"); done

log info "backup started" ",\"file\":\"$NAME\",\"schemas\":\"$SCHEMAS\""

# Stream: the unencrypted dump is never written to disk
pg_dump --dbname="$DATABASE_DIRECT_URL" --format=custom --no-owner --no-privileges \
  "${schema_args[@]}" | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" > "$WORK/$NAME" \
  || fail "pg_dump or encryption failed"

SIZE=$(wc -c < "$WORK/$NAME")
[ "$SIZE" -gt 1024 ] || fail "backup file is too small ($SIZE bytes)"
(cd "$WORK" && sha256sum "$NAME" > "$NAME.sha256")

upload() { # $1 = folder (daily|weekly)
  case "$BACKUP_DEST" in
    s3://*)
      local ep=(); [ -n "${S3_ENDPOINT:-}" ] && ep=(--endpoint-url "$S3_ENDPOINT")
      aws "${ep[@]}" s3 cp --only-show-errors "$WORK/$NAME" "${BACKUP_DEST%/}/$1/$NAME"
      aws "${ep[@]}" s3 cp --only-show-errors "$WORK/$NAME.sha256" "${BACKUP_DEST%/}/$1/$NAME.sha256" ;;
    *)
      mkdir -p "$BACKUP_DEST/$1"
      cp "$WORK/$NAME" "$WORK/$NAME.sha256" "$BACKUP_DEST/$1/" ;;
  esac
}

upload daily
[ "$(date -u +%u)" = "7" ] && upload weekly   # Sunday copy, kept longer

# Retention. S3: bucket lifecycle rules (see runbook). Local: delete old files here.
case "$BACKUP_DEST" in
  s3://*) ;;
  *)
    find "$BACKUP_DEST/daily"  -name 'remotebpo-*' -mtime +"${BACKUP_KEEP_DAILY:-7}"  -delete
    [ -d "$BACKUP_DEST/weekly" ] && find "$BACKUP_DEST/weekly" -name 'remotebpo-*' -mtime +"${BACKUP_KEEP_WEEKLY:-28}" -delete ;;
esac

log info "backup finished" ",\"file\":\"$NAME\",\"bytes\":$SIZE"

if [ -n "${BACKUP_HEARTBEAT_URL:-}" ]; then
  command -v curl >/dev/null && curl -fsS -m 10 --retry 3 "$BACKUP_HEARTBEAT_URL" >/dev/null \
    || log warn "heartbeat ping failed"
fi
