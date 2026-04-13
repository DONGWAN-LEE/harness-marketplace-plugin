#!/usr/bin/env bash
# ============================================================================
# Database Safety Guard (FastAPI variant)
# Reads JSON from stdin (Claude Code v2 hook format)
# ============================================================================
set -euo pipefail

# shellcheck disable=SC1091
source "$(dirname "$0")/_log.sh"
# shellcheck disable=SC1091
source "$(dirname "$0")/_parse.sh"

COMMAND="${TOOL_COMMAND:-}"
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

COMMAND_UPPER="$(echo "$COMMAND" | tr '[:lower:]' '[:upper:]')"

if echo "$COMMAND_UPPER" | grep -qE 'DROP\s+TABLE'; then
  log_block "db-safety" "drop-table" "command=${COMMAND:0:100}"
  echo "[DB-SAFETY] Dangerous SQL detected: DROP TABLE" >&2
  exit 2
fi

if echo "$COMMAND_UPPER" | grep -qE 'DROP\s+DATABASE'; then
  log_block "db-safety" "drop-database" "command=${COMMAND:0:100}"
  echo "[DB-SAFETY] Dangerous SQL detected: DROP DATABASE" >&2
  exit 2
fi

if echo "$COMMAND_UPPER" | grep -qE 'TRUNCATE\s'; then
  log_block "db-safety" "truncate" "command=${COMMAND:0:100}"
  echo "[DB-SAFETY] TRUNCATE detected" >&2
  exit 2
fi

if echo "$COMMAND_UPPER" | grep -qE 'DELETE\s+FROM\s' && ! echo "$COMMAND_UPPER" | grep -qE 'DELETE\s+FROM\s+\S+\s+WHERE'; then
  log_block "db-safety" "delete-without-where" "command=${COMMAND:0:100}"
  echo "[DB-SAFETY] DELETE FROM without WHERE clause" >&2
  exit 2
fi

if echo "$COMMAND_UPPER" | grep -qE 'ALTER\s+TABLE\s+\S+\s+DROP\s+COLUMN'; then
  log_block "db-safety" "drop-column" "command=${COMMAND:0:100}"
  echo "[DB-SAFETY] ALTER TABLE ... DROP COLUMN" >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE 'alembic\s+downgrade\s+base'; then
  log_block "db-safety" "alembic-downgrade-base" "command=${COMMAND:0:100}"
  echo "[DB-SAFETY] alembic downgrade base — wipes all migrations" >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '(postgres|mysql|mongodb)://[^/]*:[^/]*@'; then
  log_block "db-safety" "connection-string-with-creds" "command=${COMMAND:0:100}"
  echo "[DB-SAFETY] Connection string with embedded credentials" >&2
  exit 2
fi

exit 0
