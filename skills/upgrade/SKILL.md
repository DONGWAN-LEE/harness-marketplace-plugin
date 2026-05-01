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

1. **Check for project-harness** — verify the harness installation exists at the expected location (under user's project root):

   ```text
   .claude/skills/project-harness/project-config.yaml
   ```

   If not found → error: "No existing project-harness found. Run `/harness-marketplace:wizard` first."

2. **Read existing config**:
   - Parse `project-config.yaml`
   - Extract: version, generated_by, flags, agents, guides, run_options
   - Store as `existing_config`

3. **Compare versions (local + remote)**.

   Resolution sources (each is an external runtime path under the user's home, not a file inside this repo):

   ```text
   ${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json   (local plugin metadata)
   ~/.claude/plugins/installed_plugins.json           (find harness-marketplace@harness-marketplace entry)
   ~/.claude/plugins/known_marketplaces.json          (resolve marketplace repo URL)
   https://raw.githubusercontent.com/<owner>/<repo>/main/.claude-plugin/plugin.json   (remote head)
   ```

   Steps:

   a. Read `version` from the local plugin metadata above.
   b. Fetch latest from remote (skip if `--offline`):
      - Determine repo URL via the resolution chain above (fallback: `https://github.com/aiAgentDevelop/harness-marketplace-plugin.git`).
      - Bash: `git ls-remote <repo-url> HEAD` → verify remote is reachable.
      - WebFetch the remote metadata URL → parse `version` → `remote_version`.
      - If WebFetch fails → set `remote_version = null`, fall back to local.
   c. Determine `upgrade_version` = max(remote_version, local_plugin_version).
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

1. **List files that will be replaced** (template-based, paths under generated `project-harness/`):

   ```text
   SKILL.md                          (orchestrator)
   plan/SKILL.md
   debug/SKILL.md                    (new in v0.4.0, created if missing)
   implement/SKILL.md
   visual-qa/SKILL.md                (if has_ui)
   verify/SKILL.md
   references/classification.md
   references/schemas.md
   hooks/*.sh                        (Generated Rules section only — Custom Rules preserved)
   hooks-config.json                 (regenerated; legacy v1.x lines using $CLAUDE_TOOL_INPUT_* removed)
   hooks/_parse.sh, hooks/_log.sh    (added if missing — required v2.x helpers)
   ```

   **Exception**: if Phase 1.5 detects legacy v1.x hooks, the entire `hooks/` directory is replaced (Phase 2 backup is the recovery path). `$CLAUDE_TOOL_INPUT_*` env vars are not set under Claude Code v2.x and were causing silent no-ops.

2. **List files that will be preserved** (paths under generated `project-harness/`):

   ```text
   project-config.yaml
   agents/*.md                       (unless user requests regeneration)
   guides/*.md                       (unless user requests regeneration)
   references/options.md
   state/                            (runtime data, including learning-log.yaml)
   hooks/*.sh                        (Custom Rules section below ═══ CUSTOM RULES marker)
   .github/workflows/*.yml           (CI/CD workflows, unless user requests regeneration)
   ```

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

1. **Create backup directory**: `.claude/backups/project-harness-{timestamp}/`
   - Run `mkdir -p .claude/backups` first.
   - **Do NOT use `.claude/skills/project-harness.backup-{timestamp}/`** — Claude Code's
     skill scanner treats any directory under `.claude/skills/` as a skill candidate,
     so a skills-internal backup path causes the backup to be registered as a duplicate
     skill. Always put backups under `.claude/backups/` (outside the scan range).
2. **Copy all existing files** to backup (recursively, preserving file count)
3. **Confirm backup**: verify file count matches

## Phase 3: Upgrade Templates

1. **Re-generate template files** using existing `project-config.yaml`:
   - Load templates from `template_source/templates/` directory (remote or local fallback)
   - Apply template variable substitution using existing config (see "Template variable substitution" below)
   - Replace conditional blocks based on config flags (see "Template conditional substitution" below)
   - Write updated SKILL.md files

### YAML parsing requirements

When parsing `project-config.yaml` (with an inline Node script or otherwise),
the parser MUST correctly detect top-level key transitions. Bug 1 of issue #22
was caused by a parser that kept `section = "guides"` active when an unrelated
top-level key (`required_mcps:`) appeared — its list items were then mis-
attributed as guide entries, producing `[object Object]` guides in the output.

Correct rules:

1. **Top-level key detection**: a line matching the regex
   `^[a-z_][a-zA-Z0-9_]*:\s*(#.*)?$` with **no leading whitespace** starts a new
   top-level section. Examples: `flags:`, `guides:`, `required_mcps:`, `commands:`.
2. **Section variable**: track the current section. On every top-level key:
   - If the key is one you handle (`flags`, `guides`, `agents`, `commands`,
     `enforcement`, `ci_cd`, `self_learning`, etc.), set `section = <key>`.
   - **Otherwise set `section = null`** (this is the critical case — if you skip
     the reset, subsequent list items leak into the previously-active section).
3. **Array items**: lines beginning with `-` at indent > 0 belong to the current
   section. Indent tracking identifies nesting depth.
4. **Indented key/value** (e.g. `  has_ui: true` under `flags:`): append to the
   current section's object/array.
5. **End-of-file**: close the last open section when input ends.

Use `js-yaml` or Node's own YAML support if available in the template source
cache; fall back to an inline regex parser only when no library is accessible.
Prefer a library: the inline parser is the source of all past upgrade bugs.

### Template conditional substitution

Templates in `templates/hooks/*.sh.template` and
`templates/hooks/hooks-config.json.template` use `{{CONDITION:<flag>}}` /
`{{/CONDITION:<flag>}}` blocks and `{{VAR}}` scalar placeholders. The upgrade
processor MUST support the full set of flags in use today (Bug 2 of issue #22).

**Supported conditional flags** (evaluate to boolean, then keep or drop the
enclosed block accordingly):

| Flag | Evaluates to |
|---|---|
| `enforcement_active` | `config.enforcement.level !== "none"` |
| `enforcement_none` | `config.enforcement.level === "none"` |
| `enforcement_protected_files` | `config.enforcement.level !== "none"` (same active rule — legacy alias) |
| `enforcement_secret_guard` | `config.enforcement.level !== "none"` |
| `enforcement_pattern_guard` | `config.enforcement.level !== "none"` |
| `has_lint` | `!!config.commands.lint && config.commands.lint.trim().length > 0` |
| `has_typecheck` | `!!config.commands.typecheck && config.commands.typecheck.trim().length > 0` |
| `has_formatter` | `!!config.commands.format && config.commands.format.trim().length > 0` |
| `cicd_active` | `config.ci_cd.platform && !["none","deferred"].includes(config.ci_cd.platform)` |
| `cicd_none` | negation of `cicd_active` |
| `has_database` / `has_ui` / `has_backend` / `has_auth` / `has_realtime` | `!!config.flags.<flag>` |
| `fsd` | `config.flags.architecture === "FSD"` |
| `clean_architecture` | `config.flags.architecture === "clean_architecture"` |
| `has_alembic` | `!!config.flags.has_alembic` (FastAPI projects) |

**Processing steps**:

1. For each `{{CONDITION:xxx}} ... {{/CONDITION:xxx}}` pair:
   - Evaluate the flag using the table above.
   - If **true**: strip only the opening and closing markers, keep the enclosed content.
   - If **false**: remove the entire block including markers.
2. For each `{{VAR}}` placeholder: replace with the corresponding value:
   - `{{VERSION}}` — current plugin version (from `plugin.json`)
   - `{{PROJECT_NAME}}` — e.g. `project-harness`
   - `{{PROTECTED_FILES}}` — comma-joined `enforcement.protected_files` array entries, or empty string
   - `{{LINT_COMMAND}}`, `{{TYPECHECK_COMMAND}}`, `{{FORMAT_COMMAND}}` — from `commands.*`
3. **hooks-config.json cleanup** (required for valid JSON after conditional removal):
   - Remove empty lines: `content.replace(/^\s*\n/gm, '')`
   - Strip trailing commas before `]` or `}`: `content.replace(/,(\s*[\]}])/g, '$1')`
   - `JSON.parse` then `JSON.stringify(parsed, null, 2)` to normalize formatting.
   - If `JSON.parse` fails, emit a warning and write the unparsed text so the
     user can inspect — do not silently corrupt the file.

2. **Upgrade hook scripts** (if enforcement.level != "none"):

   **If hook_upgrade_mode == "v1.x_legacy" (full replace, see Phase 1.5)**:
   - The Phase 2 backup already preserved the old hooks in
     `.claude/backups/project-harness-{timestamp}/hooks/`.
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
         .claude/backups/project-harness-{timestamp}/hooks/
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

2.5. **Upgrade project-root CLAUDE.md** (orchestration entrypoint guide):

   Check for `./CLAUDE.md` at project root (NOT inside `.claude/`).

   **If `./CLAUDE.md` does not exist**:
   - This project was generated by a pre-v0.6 wizard that didn't produce CLAUDE.md.
   - Render fresh from `templates/CLAUDE.md.template` with current config (same
     substitution rules as wizard Step 5.1b)
   - Write to `./CLAUDE.md`
   - Log: `claude_md_upgrade = "created"`

   **If `./CLAUDE.md` exists with harness markers** (contains both `<!-- ═══ GENERATED BY harness-marketplace` header and `<!-- ═══ END GENERATED CONTENT` footer):
   - Marker-based merge (same pattern as hook `═══ CUSTOM RULES BELOW ═══`):
     a. Read existing file
     b. Locate header marker line index (H) and footer marker line index (F)
     c. Preserve lines `[0..H-1]` (pre-header, usually empty) and `[F+1..end]`
        (everything after footer — includes user's Custom Rules section)
     d. Re-render GENERATED region (inclusive H..F) from
        `templates/CLAUDE.md.template` with current config
     e. Write: `pre-header + new-generated-region + preserved-custom-rules`
   - Log: `claude_md_upgrade = "merged"`

   **If `./CLAUDE.md` exists but has NO harness markers** (hand-written file or
   pre-marker version):
   - AskUserQuestion: "기존 CLAUDE.md 에 harness 마커가 없습니다. 어떻게 처리할까요?"
     label_ko: "마커 없는 CLAUDE.md 처리"
     options:
       (a) "백업 후 전체 교체 (권장 — Custom Rules 수동 이전 필요)"
           → mv ./CLAUDE.md ./CLAUDE.md.backup-{ISO-timestamp}
           → render fresh
           → print: "기존 내용은 ./CLAUDE.md.backup-{timestamp} 에 보존됨. 팀 규칙은
             새 CLAUDE.md 의 `## Custom Rules` 섹션으로 직접 이동하세요."
           → log: `claude_md_upgrade = "replaced_with_backup"`
       (b) "건너뛰기 (CLAUDE.md 유지, orchestration 안내는 수동으로 추가)"
           → skip
           → log: `claude_md_upgrade = "skipped"`
           → print: "/project-harness 명령이 entrypoint 입니다. 수동으로 CLAUDE.md 에
             안내를 추가하거나 전체 교체를 원하면 다시 upgrade 실행하세요."

2.6. **Upgrade Option-Z reference files & optional skills** (new in v0.6):

   신규 reference/skill 파일들은 자유롭게 overwrite 해도 안전 (사용자 편집 영역 없음,
   커스텀 지침은 CLAUDE.md § Custom Rules 에 저장). 단 조건부 activation 은 기존 설정 보존.

   **Always overwrite (no Custom Rules)** — destination ← source mapping:

   ```text
   references/progress-format.md     ← templates/progress-format.md
   references/ui-conventions.md      ← templates/ui-conventions.md
   references/handoff-templates.md   ← templates/handoff-templates.md
   references/schemas.md             ← templates/schemas.md
   references/guide-injection.md     ← templates/guide-injection.md
   references/monitor-mode.md        ← templates/monitor-mode.md
   references/parallel-execution.md  ← templates/parallel-execution.md
   codebase-analysis/SKILL.md        ← templates/codebase-analysis.md
   ```

   **Conditional (activation flag 재평가 후 처리)**:
   ```
   if project-config.yaml.flags.has_ui == true:
     → write references/ui-defect-patterns.md (overwrite OK)
   else:
     → if references/ui-defect-patterns.md exists: remove it (flag 이 false 로 바뀐 경우)

   if project-config.yaml.tech_stack.architecture == 'fsd':
     → write references/fsd-scaffold-patterns.md
   else:
     → remove if exists

   if project-config.yaml.pipeline.implement_strategy != 'standard':
     → write references/tdd-implementation.md
   else:
     → remove if exists
   ```

   **Agent/guide entries for H1 (supabase-security-gate, supabase-security)** — 재생성 건너뜀 (사용자가 Custom Rules 로 편집했을 가능성). 대신 AskUserQuestion: "agent/guide 를 data/agents.yaml 최신 버전으로 재생성할까요?" 옵션은 [Yes (Custom Rules 손실)] / [No (현재 유지)] / [diff 먼저 보기].

   영향 받는 파일 (생성된 harness 내부):

   ```text
   agents/supabase-security-gate.md
   guides/supabase-security.md
   ```

   Log: `option_z_upgrade = "done"` with per-file action record.

3. **Upgrade CI/CD workflows** (if ci_cd.platform not in ["none", "deferred"]):
   - Only regenerate if user selected "Regenerate CI/CD" option
   - Preserve user customizations by default
   - If new pipeline types available, offer to add them
   - If ci_cd.platform == "deferred": inform user "CI/CD was deferred. Run /harness-marketplace:ci-cd to configure."

4. **Preserve self-learning data** — never touch the runtime state under generated harness:

   ```text
   state/learning-log.yaml          (self-learning history, never overwritten)
   ```

   Custom Rules added by self-learning are preserved (Step 2 above).

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
1. Remove current `.claude/skills/project-harness/` directory
2. Restore from backup at `.claude/backups/project-harness-{timestamp}/` (Phase 2 path)
3. Remove the backup directory once restoration is confirmed
4. If remote_fetched: `rm -rf /tmp/harness-marketplace-{timestamp}/`
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

## Purpose

이 skill 의 owns: 사용자 프로젝트의 기존 `project-harness` 를 최신 marketplace 템플릿으로 갱신하면서 사용자 작성 데이터 (`project-config.yaml`, hook Custom Rules, `state/` 의 self-learning 이력) 를 보존한다.

## Common modification patterns

- **새 template 파일 추가** — `templates/` 에 신규 파일 → 본 skill 의 Phase 3 overwrite 룰에 매핑 추가 → `scripts/validate-harness.js` 의 `REQUIRED_FILES` 동기.
- **Custom Rules 마커 위치 변경** — 호환성 유지 위해 기존 마커 (`═══ CUSTOM RULES BELOW`) 와 새 마커 양쪽을 한동안 인식. **반드시** backward-compat 기간을 ADR 로 기록.
- **Hook contract 변경 (v1.x → v2.x 같은)** — 본 skill 의 Phase 1.5 (legacy detection) 갱신 + backup-as-recovery path 보존 + CHANGELOG `BREAKING` 명시.

**Why** patterns 섹션이 별도로 필요한가: upgrade 는 사용자 데이터를 잃을 risk 가 가장 큰 skill — 변경 시 표준 시퀀스를 따르면 회귀 차단.

## Cross-module dependencies

- `templates/` — 갱신 source. wizard 와 공유.
- `data/agents.yaml`, `data/guides.yaml` — 옵션 카탈로그. wizard 와 공유.
- `scripts/validate-harness.js` — Phase 5 머지-게이트.
- `skills/wizard/SKILL.md` — 형제 skill. 산출물 schema 가 일관되어야 upgrade 가 양쪽을 모두 지원.

## See also

- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — 모듈 의존 그래프.
- [`../../docs/adr/002-file-based-state.md`](../../docs/adr/002-file-based-state.md) — self-learning log 보존 룰의 결정 근거.
- [`../../UPGRADE.md`](../../UPGRADE.md) — 사용자용 upgrade flow.
