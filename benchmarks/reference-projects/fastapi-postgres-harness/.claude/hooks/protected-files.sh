#!/usr/bin/env bash
# ============================================================================
# Protected Files Guard (FastAPI variant)
# Reads JSON from stdin (Claude Code v2 hook format)
# ============================================================================
set -euo pipefail

# shellcheck disable=SC1091
source "$(dirname "$0")/_log.sh"
# shellcheck disable=SC1091
source "$(dirname "$0")/_parse.sh"

FILE_PATH="${TOOL_FILE_PATH:-}"
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

FILE_PATH="${FILE_PATH//\\//}"

BUILTIN_PATTERNS=(
  '.env'
  '.env.local'
  '.env.production'
  'poetry.lock'
  'Pipfile.lock'
  'uv.lock'
  'requirements.lock'
)

check_basename_or_contains() {
  local pattern="$1"
  local filepath="$2"
  local base
  base="$(basename "$filepath")"
  if [[ "$base" == "$pattern" ]]; then
    return 0
  fi
  return 1
}

for pattern in "${BUILTIN_PATTERNS[@]}"; do
  if check_basename_or_contains "$pattern" "$FILE_PATH"; then
    log_block "protected-files" "builtin-pattern" "pattern=$pattern path=$FILE_PATH"
    echo "[PROTECTED] File '$FILE_PATH' matches protected pattern '$pattern'." >&2
    exit 2
  fi
done

# Alembic migrations and config are protected
case "$FILE_PATH" in
  */alembic/versions/*.py)
    log_block "protected-files" "alembic-migration" "path=$FILE_PATH"
    echo "[PROTECTED] File '$FILE_PATH' is an applied migration and should not be modified." >&2
    exit 2
    ;;
  */alembic.ini|alembic.ini)
    log_block "protected-files" "alembic-config" "path=$FILE_PATH"
    echo "[PROTECTED] File '$FILE_PATH' is Alembic config and should not be modified." >&2
    exit 2
    ;;
esac

exit 0
