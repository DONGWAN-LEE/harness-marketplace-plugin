#!/usr/bin/env bash
# ============================================================================
# Pattern Guard (Next.js Architecture rules)
# Event: PreToolUse | Matcher: Edit
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
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

FILE_CONTENT=""
if [[ -f "$FILE_PATH" ]]; then
  FILE_CONTENT="$(cat "$FILE_PATH" 2>/dev/null || true)"
fi

# Rule: API route handlers must use shared supabase client from lib/supabase
case "$FILE_PATH" in
  */app/api/*)
    if [[ -n "$FILE_CONTENT" ]]; then
      if echo "$FILE_CONTENT" | grep -qE "createClient\s*\(\s*['\"].*['\"]" && ! echo "$FILE_CONTENT" | grep -qE "from\s+['\"][^'\"]*lib/supabase"; then
        log_block "pattern-guard" "api-direct-supabase-client" "path=$FILE_PATH"
        echo "[PATTERN] API route '$FILE_PATH' instantiates Supabase client directly." >&2
        echo "Use the shared client from '@/lib/supabase' instead." >&2
        exit 2
      fi
    fi
    ;;
esac

# Rule: Server components (no 'use client') must not use browser APIs
case "$FILE_PATH" in
  */app/*.tsx)
    if [[ -n "$FILE_CONTENT" ]]; then
      if ! echo "$FILE_CONTENT" | head -3 | grep -q "'use client'"; then
        if echo "$FILE_CONTENT" | grep -qE '\b(localStorage|sessionStorage|window\.|document\.)'; then
          log_block "pattern-guard" "server-component-browser-api" "path=$FILE_PATH"
          echo "[PATTERN] Server component '$FILE_PATH' uses browser APIs." >&2
          echo "Add 'use client' directive at the top or refactor to server-safe code." >&2
          exit 2
        fi
      fi
    fi
    ;;
esac

exit 0
