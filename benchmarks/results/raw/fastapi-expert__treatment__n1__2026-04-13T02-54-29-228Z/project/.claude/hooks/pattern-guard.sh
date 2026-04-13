#!/usr/bin/env bash
# ============================================================================
# Pattern Guard (FastAPI architecture rules)
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

case "$FILE_PATH" in
  *.py) ;;
  *) exit 0 ;;
esac

FILE_CONTENT=""
if [[ -f "$FILE_PATH" ]]; then
  FILE_CONTENT="$(cat "$FILE_PATH" 2>/dev/null || true)"
fi

# Rule: routes must not use string-formatted SQL (injection risk)
case "$FILE_PATH" in
  */routes/*|*/api/*)
    if [[ -n "$FILE_CONTENT" ]]; then
      if echo "$FILE_CONTENT" | grep -qE 'execute\s*\(\s*f["\x27]'; then
        log_block "pattern-guard" "fstring-sql-in-route" "path=$FILE_PATH"
        echo "[PATTERN] Route '$FILE_PATH' uses f-string SQL — injection risk." >&2
        echo "Use parameterized queries: session.execute(text('... :param'), {'param': value})" >&2
        exit 2
      fi
      if echo "$FILE_CONTENT" | grep -qE 'execute\s*\(\s*["\x27]SELECT[^"\x27]*["\x27]\s*\+'; then
        log_block "pattern-guard" "concat-sql-in-route" "path=$FILE_PATH"
        echo "[PATTERN] Route '$FILE_PATH' uses string concatenation for SQL — injection risk." >&2
        exit 2
      fi
    fi
    ;;
esac

# Rule: route handlers must use Depends() for DB sessions
case "$FILE_PATH" in
  */routes/*)
    if [[ -n "$FILE_CONTENT" ]]; then
      if echo "$FILE_CONTENT" | grep -qE 'from\s+app\.database\s+import\s+SessionLocal' && ! echo "$FILE_CONTENT" | grep -qE 'from\s+app\.database\s+import\s+.*get_db'; then
        log_block "pattern-guard" "direct-sessionlocal-import" "path=$FILE_PATH"
        echo "[PATTERN] Route '$FILE_PATH' imports SessionLocal directly." >&2
        echo "Use 'from app.database import get_db' with Depends(get_db) instead." >&2
        exit 2
      fi
    fi
    ;;
esac

exit 0
