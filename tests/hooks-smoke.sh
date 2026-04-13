#!/usr/bin/env bash
# ============================================================================
# Smoke test for v2.x hook templates
#
# Compiles each templates/hooks/*.sh.template into a runnable .sh by stripping
# placeholders, then exercises the resulting hooks via stdin JSON to verify:
#   - PreToolUse blocking hooks return exit 2 + write to stderr on violation
#   - PreToolUse hooks return exit 0 on benign input
#   - PostToolUse / SessionStart hooks return exit 0
#
# Usage: bash tests/hooks-smoke.sh
# Exit:  0 = all tests pass, 1 = any test failed
# ============================================================================
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATES_DIR="$REPO_ROOT/templates/hooks"
WORK_DIR="$(mktemp -d -t hooks-smoke-XXXXXX)"
HOOK_DIR="$WORK_DIR/hooks"
mkdir -p "$HOOK_DIR"

cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

PASS=0
FAIL=0
FAILED_CASES=()

# ----------------------------------------------------------------------------
# Compile templates → runnable hook scripts under $HOOK_DIR
# - Strip {{CONDITION:xxx}} and {{/CONDITION:xxx}} markers (keep enclosed content)
# - Replace generic {{VAR}} placeholders with empty strings
# - Copy helpers as-is
# ----------------------------------------------------------------------------
cp "$TEMPLATES_DIR/_parse.sh" "$HOOK_DIR/_parse.sh"
cp "$TEMPLATES_DIR/_log.sh" "$HOOK_DIR/_log.sh"
chmod +x "$HOOK_DIR"/*.sh

for tpl in "$TEMPLATES_DIR"/*.sh.template; do
  name="$(basename "$tpl" .template)"
  # Strip CONDITION markers, then any remaining {{...}} placeholder
  sed -E 's/\{\{\/?CONDITION:[a-zA-Z_]+\}\}//g; s/\{\{[A-Z_]+\}\}//g' "$tpl" > "$HOOK_DIR/$name"
  chmod +x "$HOOK_DIR/$name"
done

# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
run_hook() {
  # run_hook <hook-name> <stdin-json>
  # Echoes "EXIT=<code>" + stderr contents
  local hook="$1"
  local payload="$2"
  local stderr_file
  stderr_file="$(mktemp)"
  local exit_code
  echo "$payload" | bash "$HOOK_DIR/$hook" >/dev/null 2>"$stderr_file"
  exit_code=$?
  echo "EXIT=$exit_code"
  cat "$stderr_file"
  rm -f "$stderr_file"
}

assert_exit() {
  # assert_exit <case-name> <expected-exit> <hook-output>
  local name="$1"
  local expected="$2"
  local output="$3"
  local actual
  actual="$(echo "$output" | head -n1 | sed 's/EXIT=//')"
  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS: $name (exit $actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name (expected exit $expected, got $actual)"
    echo "$output" | sed 's/^/    /'
    FAIL=$((FAIL + 1))
    FAILED_CASES+=("$name")
  fi
}

# ----------------------------------------------------------------------------
# protected-files.sh
# ----------------------------------------------------------------------------
echo "=== protected-files.sh ==="
out=$(run_hook protected-files.sh '{"tool_input":{"file_path":".env"}}')
assert_exit "blocks .env"          2 "$out"
out=$(run_hook protected-files.sh '{"tool_input":{"file_path":"package-lock.json"}}')
assert_exit "blocks package-lock.json" 2 "$out"
out=$(run_hook protected-files.sh '{"tool_input":{"file_path":"src/index.ts"}}')
assert_exit "allows src/index.ts"  0 "$out"
out=$(run_hook protected-files.sh '{"tool_input":{}}')
assert_exit "allows empty path"    0 "$out"

# ----------------------------------------------------------------------------
# secret-guard.sh
# ----------------------------------------------------------------------------
echo ""
echo "=== secret-guard.sh ==="
out=$(run_hook secret-guard.sh '{"tool_input":{"file_path":"src/aws.ts","content":"const key = \"AKIAIOSFODNN7EXAMPLE\""}}')
assert_exit "blocks AWS access key" 2 "$out"
out=$(run_hook secret-guard.sh '{"tool_input":{"file_path":"src/safe.ts","content":"const value = process.env.API_KEY"}}')
assert_exit "allows process.env reference" 0 "$out"
out=$(run_hook secret-guard.sh '{"tool_input":{"file_path":"src/empty.ts","content":""}}')
assert_exit "allows empty content"  0 "$out"

# ----------------------------------------------------------------------------
# pattern-guard.sh
# ----------------------------------------------------------------------------
echo ""
echo "=== pattern-guard.sh ==="
out=$(run_hook pattern-guard.sh '{"tool_input":{"file_path":"README.md"}}')
assert_exit "allows non-source files (.md)" 0 "$out"
out=$(run_hook pattern-guard.sh '{"tool_input":{"file_path":"src/non-existent.ts"}}')
assert_exit "allows non-existent source file" 0 "$out"
out=$(run_hook pattern-guard.sh '{"tool_input":{}}')
assert_exit "allows empty path"      0 "$out"

# ----------------------------------------------------------------------------
# db-safety.sh
# ----------------------------------------------------------------------------
echo ""
echo "=== db-safety.sh ==="
out=$(run_hook db-safety.sh '{"tool_input":{"command":"psql -c \"DROP TABLE users\""}}')
assert_exit "blocks DROP TABLE"      2 "$out"
out=$(run_hook db-safety.sh '{"tool_input":{"command":"psql -c \"TRUNCATE users\""}}')
assert_exit "blocks TRUNCATE"        2 "$out"
out=$(run_hook db-safety.sh '{"tool_input":{"command":"psql -c \"DELETE FROM users\""}}')
assert_exit "blocks DELETE without WHERE" 2 "$out"
out=$(run_hook db-safety.sh '{"tool_input":{"command":"psql -c \"SELECT * FROM users\""}}')
assert_exit "allows SELECT"          0 "$out"
out=$(run_hook db-safety.sh '{"tool_input":{"command":""}}')
assert_exit "allows empty command"   0 "$out"

# ----------------------------------------------------------------------------
# PostToolUse hooks (always exit 0)
# ----------------------------------------------------------------------------
echo ""
echo "=== post-edit-lint.sh ==="
out=$(run_hook post-edit-lint.sh '{"tool_input":{"file_path":"README.md"}}')
assert_exit "non-source file → exit 0" 0 "$out"
out=$(run_hook post-edit-lint.sh '{"tool_input":{}}')
assert_exit "empty path → exit 0"     0 "$out"

echo ""
echo "=== post-edit-typecheck.sh ==="
out=$(run_hook post-edit-typecheck.sh '{"tool_input":{"file_path":"README.md"}}')
assert_exit "non-ts file → exit 0"     0 "$out"

echo ""
echo "=== post-edit-format.sh ==="
out=$(run_hook post-edit-format.sh '{"tool_input":{"file_path":"foo.unknown"}}')
assert_exit "unknown ext → exit 0"     0 "$out"

# ----------------------------------------------------------------------------
# session-init.sh (no tool_input, exit 0)
# ----------------------------------------------------------------------------
echo ""
echo "=== session-init.sh ==="
# session-init does not source _parse.sh; pass empty stdin via /dev/null
exit_code=0
bash "$HOOK_DIR/session-init.sh" </dev/null >/dev/null 2>&1 || exit_code=$?
if [[ "$exit_code" == "0" ]]; then
  echo "  PASS: session-init runs without error (exit 0)"
  PASS=$((PASS + 1))
else
  echo "  FAIL: session-init exited with code $exit_code"
  FAIL=$((FAIL + 1))
  FAILED_CASES+=("session-init exit")
fi

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
echo ""
echo "=========================="
echo "Passed: $PASS"
echo "Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  echo "Failed cases:"
  for c in "${FAILED_CASES[@]}"; do
    echo "  - $c"
  done
  exit 1
fi
exit 0
