# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-04-10

### Added
- **Agent catalog** (`data/agents.yaml`) — 34 agents across 11 domains (security, performance, database, architecture, quality, frontend, devops, game, data, iot, debugging). Wizard Step B now loads from catalog, filters by project type, shows all matching agents as checkboxes with AI recommendations.
- **Guide catalog** (`data/guides.yaml`) — 18 guides across 8 domains. Wizard Step C now data-driven with same filter+checkbox pattern.
- **Debug phase** (`templates/debug.md`) — New pipeline phase between plan and implement for bugfix tasks. Systematic investigation: error reproduction → hypothesis generation → parallel investigation (4 agents) → impact analysis → evidence collection.
- **Debug strategies** (`data/debug-strategies.yaml`) — Error-type debugging strategy catalog covering runtime, compile, logic, performance, concurrency, and environment errors.
- **4 debug-specific agents** — root-cause-analyst (opus), error-trace-mapper, impact-analyzer, runtime-inspector for parallel bug investigation.
- **Debug complexity assessment** in classification system — auto-scores bugfix tasks as low/medium/high to decide whether debug phase runs.
- **Smart debug routing** — simple bugs (typo, missing import) skip debug phase; complex bugs (race condition, intermittent) get full investigation.
- **DebugResult → implement handoff** — implement phase uses confirmed root cause and impact locations for targeted, comprehensive fixes.
- `--skip-debug` flag for project-harness orchestrator.

### Changed
- Wizard Step B (agents) and Step C (guides) rewritten from pure AI-generated to data-catalog-driven with AI recommendation labels.
- Pipeline structure: plan → **debug** → implement → verify (debug is conditional on bugfix + complexity).
- Bugfix implement pipeline enhanced with impact-fixer worker when DebugResult provides same-pattern locations.

## [0.3.0] - 2026-04-09

### Added
- **learn skill** (`/harness-marketplace:learn`) — Save team-shared learnings to git-tracked files under `.harness/learnings/`. Timestamp+author filenames prevent team conflicts. `--consolidate` merges duplicates and archives originals.
- **gh skill** (`/harness-marketplace:gh`) — Automate GitHub workflow (Issue → Branch → Commit → PR) with user approval at every step. Never auto-merges PRs. Supports `--no-issue` and `--draft` flags.

## [0.2.2] - 2026-04-09

### Fixed
- Restored `"skills": "./skills/"` in plugin.json for auto-completion support in third-party marketplace plugins
- Synced version across plugin.json, marketplace.json, and package.json (was mismatched)

### Added
- Troubleshooting section in both READMEs (known Claude Code bugs #18949, #35641)
- Korean labels (`label_ko`, `description_ko`) for wizard mode options to prevent AI translation errors ("딕 인터뷰" → "딥 인터뷰")

## [0.2.0] - 2026-04-09

### Added
- Three wizard modes: Deep Interview, Manual Selection, Auto-Detect
- CI/CD deferred setup option ("Configure later")
- Standalone ci-cd skill (`/harness-marketplace:ci-cd`)
- Three-layer pipeline system: Hook enforcement, CI/CD generation, Self-learning

### Changed
- Removed omc dependency — all state is file-based under `state/`

## [0.1.0] - 2026-04-09

### Added
- Initial release of harness-marketplace plugin
- Wizard skill with step-by-step project setup (10+ steps)
- Upgrade skill with config-preserving template updates
- 8 deep-researched data files (project types, languages, DBs, platforms, etc.)
- 7 harness templates (orchestrator, plan, implement, visual-qa, verify, self-learning, classification)
- Validation script for structure and schema checks
- Supports 8 project categories: web, mobile, backend, desktop, game, CLI, data, IoT
- Bilingual README (EN + KO)
