---
name: upgrade
description: Upgrade existing project-harness to latest marketplace templates while preserving project-config.yaml
argument-hint: "[--preview] [--backup-only] [--offline] [project-path]"
---

<Purpose>
Upgrade an existing project-harness to the latest harness-marketplace templates. Automatically checks GitHub for the latest version and fetches templates directly — no need to update the plugin first.

Preserves the project's `project-config.yaml` (wizard answers, agents, guides) while replacing template-based files (SKILL.md orchestrator, plan, debug, implement, visual-qa, verify) with the latest versions. Falls back to local plugin cache when offline.
</Purpose>

<Use_When>
- User says "upgrade harness", "update project-harness", "update templates"
- harness-marketplace plugin was updated and user wants latest templates
- User wants to re-generate AI content (agents/guides) with new prompts
</Use_When>

<Do_Not_Use_When>
- No existing project-harness found — use `/harness-marketplace:wizard` instead
- User wants to change project type or fundamental config — re-run wizard
</Do_Not_Use_When>

<Steps>

## Phase 0: Detect Existing Harness

1. **Check for project-harness**:
   - Look for `.claude/skills/project-harness/project-config.yaml`
   - If not found → error: "No existing project-harness found. Run `/harness-marketplace:wizard` first."

2. **Read existing config**:
   - Parse `project-config.yaml`
   - Extract: version, generated_by, flags, agents, guides, run_options
   - Store as `existing_config`

3. **Compare versions (local + remote)**:
   a. Read local plugin version from plugin metadata (`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`)
   b. Fetch latest version from remote (skip if `--offline`):
      - Determine repo URL:
        1. Read `~/.claude/plugins/installed_plugins.json`
        2. Find `harness-marketplace@harness-marketplace` entry
        3. Read `~/.claude/plugins/known_marketplaces.json` for the marketplace repo URL
        4. Fallback: use `https://github.com/aiAgentDevelop/harness-marketplace-plugin.git`
      - Bash: `git ls-remote <repo-url> HEAD` → verify remote is reachable
      - WebFetch: `https://raw.githubusercontent.com/<owner>/<repo>/main/.claude-plugin/plugin.json`
      - Parse `version` field from fetched JSON → `remote_version`
      - If WebFetch fails → set `remote_version = null`, fall back to local
   c. Determine `upgrade_version` = max(remote_version, local_plugin_version)
   d. Compare `upgrade_version` vs `existing_config.generated_by`:
      - If upgrade_version > existing → proceed: "Upgrading: {existing} → {upgrade_version}"
      - If same → warn: "Already at latest version. Continue anyway?"
   e. Determine `template_source`:
      - If remote_version > local_plugin_version → use remote (Phase 0.5)
      - Else → use local: `template_source = ${CLAUDE_PLUGIN_ROOT}`

## Phase 0.5: Fetch Remote Templates (when remote is newer)

Skip this phase if `template_source` is local or `--offline` is set.

```
1. Generate temp path: /tmp/harness-marketplace-{timestamp}/
2. Bash: git clone --depth 1 <repo-url> /tmp/harness-marketplace-{timestamp}/
3. If clone succeeds:
   - Set template_source = /tmp/harness-marketplace-{timestamp}/
   - remote_fetched = true
   - Progress: "✅ Fetched latest templates (v{remote_version}) from remote"
4. If clone fails:
   - Fall back to local plugin cache
   - Set template_source = ${CLAUDE_PLUGIN_ROOT}
   - remote_fetched = false
   - Progress: "⚠️ Remote fetch failed. Using local plugin cache (v{local_plugin_version})"
```

## Phase 1: Preview Changes (--preview)

If `--preview` flag or user wants to see changes first:

1. **List files that will be replaced** (template-based):
   - `SKILL.md` (orchestrator)
   - `plan/SKILL.md`
   - `debug/SKILL.md` (new in v0.4.0, created if missing)
   - `implement/SKILL.md`
   - `visual-qa/SKILL.md` (if has_ui)
   - `verify/SKILL.md`
   - `references/classification.md`
   - `references/schemas.md`
   - `hooks/*.sh` — Generated Rules section only (Custom Rules section preserved).
     **Exception**: if Phase 1.5 detects legacy v1.x hooks, the entire
     `hooks/` directory is replaced (the Phase 2 backup is the recovery path).
   - `hooks-config.json` (regenerated from template; legacy v1.x command lines
     containing `$CLAUDE_TOOL_INPUT_*` are explicitly removed — those env vars
     are not set under Claude Code v2.x and were causing silent no-ops)
   - `hooks/_parse.sh`, `hooks/_log.sh` (added if missing — required v2.x helpers)

2. **List files that will be preserved**:
   - `project-config.yaml`
   - `agents/*.md` (unless user requests regeneration)
   - `guides/*.md` (unless user requests regeneration)
   - `references/options.md`
   - `state/` (runtime data, including `learning-log.yaml`)
   - `hooks/*.sh` — Custom Rules section (below the `═══ CUSTOM RULES` marker)
   - `.github/workflows/*.yml` (CI/CD workflows, unless user requests regeneration)

3. **Show upgrade summary** via AskUserQuestion:
   - Files to replace (count + list)
   - Files to preserve (count + list)
   - Version change (old → new)
   - Options: [Proceed / Regenerate AI content too / Cancel]

## Phase 1.5: Detect Legacy v1.x Hooks (Issue #16)

Before Phase 2, scan the existing hooks installation to determine whether it
uses the v1.x contract (which is a silent no-op under Claude Code v2.x).

```
hook_format = "v2.x"  # default

If .claude/skills/project-harness/hooks-config.json exists:
  Read its content.
  If the content contains "$CLAUDE_TOOL_INPUT_" anywhere in command strings:
    hook_format = "v1.x_legacy"

If .claude/skills/project-harness/hooks/_parse.sh does NOT exist
   AND .claude/skills/project-harness/hooks/ contains any *.sh files:
  hook_format = "v1.x_legacy"
```

The `$CLAUDE_TOOL_INPUT_*` signature is the highest-confidence indicator —
the v2.x runtime does not set those env vars and the legacy command-line
arg passing is what causes the silent no-op.

If `hook_format == "v1.x_legacy"`:
  - Print warning to user:
    ```
    ⚠️  Legacy v1.x hooks detected.
    These hooks were silent no-ops under Claude Code v2.x — your guard
    rules have not been firing. This upgrade will replace them with the
    new v2.x format (stdin JSON + exit 2). The old hooks will be saved
    to a timestamped backup directory.
    ```
  - Set `hook_upgrade_mode = "full_replace"` (used in Phase 3 step 2)

If `hook_format == "v2.x"`:
  - Proceed normally with `hook_upgrade_mode = "marker_based"`

## Phase 2: Backup

1. **Create backup directory**: `.claude/skills/project-harness.backup-{timestamp}/`
2. **Copy all existing files** to backup
3. **Confirm backup**: verify file count matches

## Phase 3: Upgrade Templates

1. **Re-generate template files** using existing `project-config.yaml`:
   - Load templates from `template_source/templates/` directory (remote or local fallback)
   - Apply template variable substitution using existing config
   - Replace conditional blocks based on config flags
   - Write updated SKILL.md files

2. **Upgrade hook scripts** (if enforcement.level != "none"):

   **If hook_upgrade_mode == "v1.x_legacy" (full replace, see Phase 1.5)**:
   - The Phase 2 backup already preserved the old hooks in
     `.claude/skills/project-harness.backup-{timestamp}/hooks/`.
   - Delete the existing `hooks/` directory entirely.
   - Re-create `hooks/` from scratch using the new v2.x templates:
     a. Copy `_parse.sh` and `_log.sh` as-is (no placeholder substitution)
     b. Generate each `*.sh` from `*.sh.template` with full placeholder + condition substitution
     c. Generate `hooks-config.json` from `hooks-config.json.template`
   - Custom Rules sections are NOT carried over (v1.x users typically had
     no marker, and the legacy rules wouldn't have been firing anyway).
     If the user had hand-edited the legacy hooks, point them at the
     backup with a clear message:
     ```
     ⚠️  v1.x hooks fully regenerated. If you had Custom Rules in any hook,
     copy them manually from:
         .claude/skills/project-harness.backup-{timestamp}/hooks/
     into the new files (look for the "═══ CUSTOM RULES BELOW ═══" marker).

     Run `claude --debug-file /tmp/hook-debug.log` after restart and grep for
     "Registered N hooks" to verify hooks now load.
     ```

   **If hook_upgrade_mode == "marker_based" (normal v2.x → v2.x upgrade)**:
   - For each hook script in `hooks/*.sh`:
     a. Skip helper files (`_parse.sh`, `_log.sh`) — overwrite them as-is from templates
     b. Read existing file
     c. Extract Custom Rules section (everything below `═══ CUSTOM RULES` marker)
     d. Re-generate the Generated Rules section from latest template
     e. Append preserved Custom Rules section
     f. Write updated file
   - Regenerate `hooks-config.json` from template
   - If new hook types were added in this version, generate new hook scripts

   In both modes:
   - Offer to re-merge hooks into settings.json
   - Run `scripts/validate-harness.js` and report any v2.x compliance failures

3. **Upgrade CI/CD workflows** (if ci_cd.platform not in ["none", "deferred"]):
   - Only regenerate if user selected "Regenerate CI/CD" option
   - Preserve user customizations by default
   - If new pipeline types available, offer to add them
   - If ci_cd.platform == "deferred": inform user "CI/CD was deferred. Run /harness-marketplace:ci-cd to configure."

4. **Preserve self-learning data**:
   - Never overwrite `state/learning-log.yaml`
   - Custom Rules added by self-learning are preserved (Step 2 above)

5. **Update version** in project-config.yaml:
   - Update `generated_by` to current marketplace version
   - Add new config sections if missing (enforcement, ci_cd, self_learning with defaults)
   - Preserve all existing config values

6. **If "Regenerate AI content" selected**:
   - Re-generate agents based on config.agents list
   - Re-generate guides based on config.guides list
   - Re-generate classification.md
   - Re-generate options.md

## Phase 4: Validate

1. **Run structure validation**: `scripts/validate-harness.js`
2. **Run plan dry-run**: Execute plan phase in dry-run mode
3. **Report results** to user:
   - Validation: PASS/FAIL
   - Files upgraded: count
   - Backup location
   - [Confirm / Rollback to backup / Re-run wizard]

## Phase 4.5: Cleanup Remote Temp Directory

```
If remote_fetched == true:
  Bash: rm -rf /tmp/harness-marketplace-{timestamp}/
  Progress: "🧹 Cleaned up temporary files"
```

## Phase 5: Rollback (if needed)

If validation fails or user requests rollback:
1. Remove current project-harness
2. Restore from backup directory
3. Remove backup directory
4. If remote_fetched: rm -rf /tmp/harness-marketplace-{timestamp}/
5. Report: "Rolled back to previous version"

</Steps>

<Tool_Usage>
- Use `Read` to parse existing project-config.yaml and plugin metadata
- Use `WebFetch` to check remote plugin.json version from GitHub raw URL
- Use `Bash` to `git clone --depth 1` for remote templates, copy backup, run validation, cleanup temp dir
- Use `Write` to create upgraded files
- Use `AskUserQuestion` for upgrade confirmation and rollback decisions
- Use `Agent(subagent_type="Explore")` to verify file structure
</Tool_Usage>
