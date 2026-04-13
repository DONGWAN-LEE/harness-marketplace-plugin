#!/usr/bin/env bash
# ============================================================================
# Post-edit Lint (non-blocking warning)
# Event: PostToolUse | Matcher: Edit,Write
# ============================================================================
# Non-blocking: this always exits 0, but reports issues to stderr.
set -u

FILE_PATH="${1:-}"
if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    ;;
  *)
    exit 0
    ;;
esac

if [[ -f "package.json" ]] && command -v npx >/dev/null 2>&1; then
  if [[ -d "node_modules/eslint" ]]; then
    npx --no-install eslint "$FILE_PATH" >&2 2>&1 || true
  fi
fi

exit 0
