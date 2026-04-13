#!/usr/bin/env bash
# ============================================================================
# Protected Files Guard
# Event: PreToolUse | Matcher: Edit,Write
# Reads JSON from stdin (Claude Code v2 hook format)
# Exit: 0 = allow, 2 = deny (Claude sees stderr)
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
  'package-lock.json'
  'pnpm-lock.yaml'
  'yarn.lock'
  'bun.lockb'
)

CONFIG_PATTERNS=(
  "next.config.js"
  "next.config.mjs"
)

check_pattern() {
  local pattern="$1"
  local filepath="$2"
  local basename
  basename="$(basename "$filepath")"
  # shellcheck disable=SC2254
  case "$basename" in
    $pattern) return 0 ;;
  esac
  if [[ "$basename" == "$pattern" ]]; then
    return 0
  fi
  return 1
}

for pattern in "${BUILTIN_PATTERNS[@]}"; do
  if check_pattern "$pattern" "$FILE_PATH"; then
    log_block "protected-files" "builtin-pattern" "pattern=$pattern path=$FILE_PATH"
    echo "[PROTECTED] File '$FILE_PATH' matches protected pattern '$pattern'." >&2
    echo "This file should not be modified by automated tools." >&2
    exit 2
  fi
done

for pattern in "${CONFIG_PATTERNS[@]}"; do
  [[ -z "$pattern" ]] && continue
  if check_pattern "$pattern" "$FILE_PATH"; then
    log_block "protected-files" "config-pattern" "pattern=$pattern path=$FILE_PATH"
    echo "[PROTECTED] File '$FILE_PATH' is protected by project config ('$pattern')." >&2
    exit 2
  fi
done

exit 0
