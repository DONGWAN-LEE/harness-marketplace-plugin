#!/usr/bin/env bash
# ============================================================================
# Secret Guard (FastAPI variant)
# Reads JSON from stdin (Claude Code v2 hook format)
# ============================================================================
set -euo pipefail

# shellcheck disable=SC1091
source "$(dirname "$0")/_log.sh"
# shellcheck disable=SC1091
source "$(dirname "$0")/_parse.sh"

FILE_PATH="${TOOL_FILE_PATH:-}"
CONTENT="${TOOL_CONTENT:-}"

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

FOUND=0
REASONS=()

while IFS= read -r match; do
  if [[ -n "$match" ]]; then
    FOUND=1
    REASONS+=("generic-secret")
  fi
done < <(echo "$CONTENT" | grep -inE '(password|passwd|api_key|apikey|api_secret|secret_key|secret|token|access_token|auth_token|jwt_secret)\s*[=:]\s*["\x27]?[a-zA-Z0-9+/=_\-]{8,}' | grep -ivE '(os\.environ|os\.getenv|settings\.|config\.|get_settings|BaseSettings|placeholder|example|changeme|your_|xxx|todo|dev-secret-do-not-use)' || true)

if echo "$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
  FOUND=1
  REASONS+=("aws-access-key-id")
fi

if echo "$CONTENT" | grep -qE '\-\-\-\-\-BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY\-\-\-\-\-'; then
  FOUND=1
  REASONS+=("private-key-block")
fi

if echo "$CONTENT" | grep -qE '(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})'; then
  FOUND=1
  REASONS+=("github-token")
fi

if echo "$CONTENT" | grep -qE "(postgresql|postgres|mysql|mongodb)://[^'\"]*:[^'\"]*@[^'\"]*"; then
  FOUND=1
  REASONS+=("db-connection-with-creds")
fi

if [[ "$FOUND" -eq 1 ]]; then
  reason_joined="$(IFS=,; echo "${REASONS[*]}")"
  log_block "secret-guard" "$reason_joined" "path=$FILE_PATH"
  echo "[SECRET-GUARD] Potential secrets detected in '$FILE_PATH':" >&2
  for r in "${REASONS[@]}"; do
    echo "  $r" >&2
  done
  echo "Use pydantic-settings and environment variables instead." >&2
  exit 2
fi

exit 0
