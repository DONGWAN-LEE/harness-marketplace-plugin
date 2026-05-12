# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.11.0] - 2026-05-12

### Highlights

**Honest Benchmarks 인프라 전면 제거 + README 현행화**. `benchmarks/` 디렉토리 전체 (runner / scorer / tasks / reference-projects / results / reports, 약 20K 라인 — full harness 가 CLAUDE.md-only 변종에 6/13 축으로 패배한다는 self-admitted weakness 데이터를 외부 노출하던 인프라) 와 모든 cross-reference (README × 2 의 "Honest Benchmarks" 섹션, Plugin Structure tree, CLAUDE.md / MEMORY.md / docs/ARCHITECTURE.md / scripts/ai-readiness-score.py / .gitignore / 과거 CHANGELOG 의 벤치마크 bullet) 제거. 동시에 README × 2 를 현 프로젝트 상태에 맞춰 동기 — Plugin Structure tree 가 v0.8.0 (`templates/integrations/`), v0.9.0 (`MEMORY.md`, `docs/`, `.github/`, `.husky/`, `scripts/ai-readiness-score.py`), 그리고 직전 PR #62 의 `agent-results.json` root 이동 까지 모두 반영. 에이전트/가이드 카탈로그 카운트 stale (34/18 → 40/25) 도 갱신.

본 릴리스는 user-facing wizard / upgrade / launch-check / ci-cd / learn / gh / generated-harness API 에 **어떤 breaking change 도 없음**. 내부 평가 인프라 제거 + 문서 동기화가 전부.

### Removed

- **`benchmarks/`** (entire directory) — Phase 1 v2 benchmark infrastructure (runner / scorer / tasks / reference-projects / results / docs) removed along with all README references. The published empirical data did not represent the plugin's intended value proposition for external readers. (PR [#62](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/62))

### Changed

- **`benchmarks/results/agent-results.json`** → **`agent-results.json`** (repo root) — relocated so the AI-Readiness scoring KPI summary survives the `benchmarks/` removal. `.claude/` is gitignored, so root placement keeps it tracked. (PR [#62](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/62))
- **`README.md`** / **`README-ko.md`** — "Honest Benchmarks" 섹션 + intro 언급 + Plugin Structure tree 의 `benchmarks/` 블록 + Version History v0.6.0 row 의 `Phase 1 v2 benchmark` 문구 제거. (PR [#62](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/62))
- **`CLAUDE.md`** / **`MEMORY.md`** — Cross-module dependencies 의 `benchmarks/` bullet 제거. (PR [#62](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/62))
- **`docs/ARCHITECTURE.md`** — mermaid 다이어그램의 `benchmarks/` 노드 + edge + 해석 bullet 제거. (PR [#62](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/62))
- **`scripts/ai-readiness-score.py`** — eval signal 튜플에서 `"benchmarks"` 제거 (`agent-results.json` glob 은 위치 무관하게 동작하므로 점수에 영향 없음). (PR [#62](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/62))
- **`.gitignore`** — `benchmarks/results/` 관련 규칙 블록 제거. (PR [#62](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/62))
- **`README.md`** / **`README-ko.md`** — 현재 프로젝트 상태에 맞춰 sync. Version History 표에 **v0.10.0** 행 추가 (v0.9.0 unbold). Plugin Structure 트리 갱신: `skills/` 에 `launch-check/SKILL.md` 추가 (6개 skills), `scripts/` 에 `ai-readiness-score.py` + `CLAUDE.md` 추가, `templates/` 에 `integrations/` (Sentry/PostHog) 추가, `data/` 카운트 14 → 15, root 에 `MEMORY.md` / `agent-results.json` / `docs/` / `.github/` / `.husky/` 추가. 카탈로그 카운트 stale 갱신: 에이전트 34 → **40**, 가이드 18 → **25** (v0.4.0 이후 증가분 반영). Manual install 예시의 `1.0.0` → **`0.10.0`** 경로 수정. (PR [#63](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/63))

### Notes

- AI-Readiness 점수: v0.10.0 기준 91 → v0.11.0 기준 **85 / 100 (AI-Ready)**. 하락 −6 은 `benchmarks/` 가 Cat E4 (`has_evals`) + Cat G (Agent Outcomes, `eval_dirs`) 두 시그널을 보강하던 효과가 빠진 의도된 결과 (`agent-results.json` 은 root 으로 옮겨 Cat G 의 `metric_files` 시그널은 유지). husky pre-commit + CI gate 의 broken-ref 임계 (5) 는 0/73 으로 통과.
- ADR-005 (3-place version sync) 준수: `plugin.json` · `marketplace.json` · `package.json` 동시 0.10.0 → **0.11.0** 갱신.

## [0.10.0] - 2026-05-11

### Highlights

wizard 완료 직후 **1회 GitHub star 프롬프트** 신설. 사용자가 wizard 로 harness 를 끝까지 만들고 "승인" 분기를 탄 시점에만 한 번 노출되며, 머신별 글로벌 마커 (`~/.claude/.harness-marketplace-star-prompted`) 로 재노출 방지. "Star on GitHub" 선택 시 `gh` CLI 가 있으면 자동 별 등록, 없으면 OS 기본 브라우저로 fallback. 사용자가 처음에 요청한 "/plugin install 직후" 시점은 Claude Code 플러그인 시스템에 공식 hook 이 없어 (plugin.json / marketplace.json 스키마에 `postInstallMessage` / `welcome` / `onInstall` 필드 없음) 차선책으로 wizard 완료 시점을 채택.

### Added

- **`skills/wizard/SKILL.md`** — new **Phase 7.5: GitHub Star Prompt** runs after a successful wizard completion (only on the "승인" branch). Asks once whether to star the repo; selecting "Star on GitHub" attempts `gh api -X PUT user/starred/aiAgentDevelop/harness-marketplace-plugin` first and falls back to opening the repo in the OS default browser (`start` / `open` / `xdg-open`). A global marker `~/.claude/.harness-marketplace-star-prompted` is written after any answer (including "Skip"), so the prompt is shown at most once per machine. KR/EN branching via the existing `wizard_language` variable. Note: Claude Code's plugin system does not expose a hook that fires the instant `/plugin install` completes, so wizard completion is the closest natural moment to surface this. (#59 / #60)
- **`README.md`** / **`README-ko.md`** — Installation 섹션에 1회 star 프롬프트 동작 안내 blockquote 추가 (KR/EN 동기).

## [0.9.0] - 2026-05-01

### Highlights

AI-Readiness 인프라 신설 — 레포 자체가 v2 100점 루브릭 (7 카테고리: Navigation / Context Quality / Tribal Knowledge / Dependency Mapping / Verification Gates / Freshness / Agent Outcomes) 으로 측정 가능해지고, 점수가 **45 → 91 (AI-Native, top tier)** 로 상승. 환각 path 0/84. 회귀 방지: PR 단위 CI gate + 로컬 husky pre-commit gate 가 모든 변경에 대해 broken context refs 임계 (5 이내) 강제. 동시에 tribal knowledge 가 외부화 (MEMORY.md + 5 ADRs + ARCHITECTURE.md mermaid 3종) 되어 신규 컨트리뷰터·에이전트 모두 의사결정 근거를 즉시 참조 가능.

### Added

- **`MEMORY.md`** (root, new) — repo-level tribal-knowledge externalization store. Lists active decisions (cross-linked to ADR series), common gotchas, conventions, cross-module dependency overview. Closes Cat C Q5 of the AI-Readiness rubric.
- **`docs/adr/`** (new directory) — Architecture Decision Records. Five initial ADRs:
  - [ADR-000](docs/adr/000-template.md) — ADR template
  - [ADR-001](docs/adr/001-three-mode-wizard.md) — Wizard 3-mode entry (Deep Interview / Manual / Auto-Detect)
  - [ADR-002](docs/adr/002-file-based-state.md) — File-based state, no external deps, no omc
  - [ADR-003](docs/adr/003-korean-labels-direct.md) — Korean UI labels written directly (no AI translation)
  - [ADR-004](docs/adr/004-issue-branch-pr-merge.md) — Issue → Branch → PR → Merge for all changes
  - [ADR-005](docs/adr/005-version-three-place-sync.md) — Version sync across plugin.json / marketplace.json / package.json
- **`docs/ARCHITECTURE.md`** (new) — system overview with three mermaid diagrams: high-level data flow (input → wizard → templates → harness output), three-layer architecture (Hook / CI/CD / Self-Learning) with self-learning feedback edges, module dependency graph (8 modules across skills / infra / resources / telemetry).
- **`scripts/CLAUDE.md`** (new) — module-level context for the `scripts/` tree. Describes the role of `validate-harness.js` and `merge-hooks.js` as the merge-time integrity gate for wizard output, with quick commands and cross-refs to `skills/wizard/SKILL.md` / `tests/`. Closes the AI-Readiness Cat A coverage gap (8/8 modules now have agent context).
- **`scripts/ai-readiness-score.py`** (new) — vendored copy of the AI-Readiness Cartography scorer (v2 rubric, 7 categories / 100 pts). Used by the new CI gate; runs stdlib-only, no deps.
- **`.github/workflows/ai-readiness.yml`** (new) — AI-Readiness Gate. On every PR and push to `main`, runs the scorer and fails if hallucinated path references in agent-context docs (CLAUDE.md / SKILL.md / README.md) exceed 5. Uploads the JSON scorecard as an artifact (30-day retention).
- **`.github/CODEOWNERS`** (new) — explicit ownership for `scripts/`, `skills/`, `templates/`, `data/`, `.github/`, `.claude-plugin/`. Wires up GitHub auto-review-request and unblocks E2 (independent critic infra) on the AI-Readiness rubric.
- **`.github/pull_request_template.md`** (new) — PR scaffold with Summary / Category / Impact / Verification sections. Embeds the project rules as checklist items: README + README-ko sync, CHANGELOG update, version-three-place sync (when applicable), and the "fence generated-output paths" convention so the AI-Readiness Gate doesn't false-flag them.

### Changed

- **`CLAUDE.md`** (root) — `### State Management` section reorganized: the `state/pipeline-state.json` / `state/handoffs/` / `state/results/` / `state/learning-log.yaml` listing moved into a fenced `text` block with an explicit note that these paths live inside the user's project after wizard completion, not in this plugin repo. Removes a long-standing source of false-positive hallucinated-path flags.
- **`skills/upgrade/SKILL.md`** — three path-heavy sections (Phase 0 harness check, Phase 0 version-compare resolution chain, Phase 1 replace/preserve lists, Phase 2.6 always-overwrite + supabase-security agent/guide entries, Phase 3 self-learning preservation) restructured: bullet lists with inline-coded path references converted into fenced `text` blocks. Same content, but agent-context path scanners now correctly recognize these as generated-output references rather than this-repo references.
- **`skills/launch-check/SKILL.md`** — Roadmap section's "planned but not yet shipped" template files (`templates/e2e-patterns.md`, `templates/contract-test-patterns.md`, `templates/playbooks/*`) consolidated into a single fenced "Planned" block.
- **`README.md`** / **`README-ko.md`** — three sections describing wizard-generated output (`prd/service-prd.md`, observability boilerplate file list, `.claude/settings.json` mention in upgrade migration + try-it-on-throwaway-dir intro) reorganized so the path lists live inside fenced `text` blocks. README + README-ko stay in sync (project rule).
- **`skills/wizard/SKILL.md`** — Step 5.3 (AI-Generate Specialized Files) rewritten to eliminate the apparent-freeze experience during agent/guide generation. Three concrete changes: (1) pre-announcement box printed before any Agent tool call showing `n_agents + n_guides + n_batches + expected_time`, so the user knows how long the silent window actually is; (2) **PARALLEL REQUIRED** directive with `batch_size = 4` — within each batch, Agent tool calls MUST be issued as multiple tool-use blocks in a single assistant message (matching `templates/parallel-execution.md` convention), reducing wall-time from `sum(worker)` to `max(worker)` per batch (~4× speedup at 12+ agents); (3) per-batch progress line printed after each batch's tool results return (`[i/N] Done: {names} (Xs) ✓ | Remaining: M`). Includes rate-limit fallback to `batch_size = 2` (never sequential — sequential recreates the silence problem). Prompt templates and output paths unchanged; classification.md/options.md remain serial at the end.
- **`README.md`** / **`README-ko.md`** — Quick Start now includes an explicit Step 3 `/reload-plugins` after `/harness-marketplace:wizard` completes, with a callout explaining the two different reload moments (full restart after plugin install due to [#35641](https://github.com/anthropics/claude-code/issues/35641), vs. `/reload-plugins` being sufficient after wizard since the generated files live in project-local `.claude/`). Added new Troubleshooting subsection "Wizard finished, but `/project-harness` is not available" with cause, fix, and verification steps.

### Notes

- Repo's AI-Readiness score moved 45 → 57 (AI-Fragile, amber) after the **track A bundle** (CI gate, ref-fence, governance), then **57 → 87 (AI-Ready, green)** after the **C/D foundations bundle** (MEMORY.md + 5 ADRs + ARCHITECTURE.md + per-module Owns/Patterns/Deps/Why-marker standardization across all 8 modules), then **87 → 91 (AI-Native, top tier)** after the **Phase 2 F/G refinement** (husky pre-commit gate + `agent-results.json` distilled KPI summary). All A-G categories now hit ≥ 87% of max except Cat B (13/20, README compass-not-encyclopedia compression pending) and Cat D (13/15, 2 pts gated on monorepo workspace file which doesn't apply here).

### Added (Phase 2 — F/G refinement)

- **`.husky/pre-commit`** (new) — local gate that runs `scripts/ai-readiness-score.py` and blocks the commit if hallucinated path refs exceed 5 (mirrors the CI threshold in `.github/workflows/ai-readiness.yml`). Skips silently if Python or the scorer aren't available so contributors without a local Python install aren't blocked. Provides actionable remediation hint about fenced `text` blocks for generated-output paths.
- **`package.json`** (modified) — `devDependencies.husky` (`^9.1.0`) + `scripts.prepare` (`husky || true`) so `npm install` registers the hook on contributor machines. Skip-on-error keeps fresh clones from blowing up if husky binary isn't yet resolved.
- **`agent-results.json`** (new, repo root) — distilled KPI summary. Schema: per-run cells planned vs completed + cost vs budget + per-condition weighted totals. The file's discoverability lets the AI-Readiness scorer (Cat G — Agent Outcomes) pick it up via `**/agent-results.json` glob.

## [0.8.0] - 2026-04-17

### Highlights

Observability layer 신설 — Wizard가 에러 추적·프로덕트 분석·APM 플랫폼 선택을 **필수 게이트**로 처리하고, Sentry/PostHog용 보일러플레이트 템플릿을 실제 프로젝트에 방출합니다. 동시에 `launch-check` 스킬 신설 — 출시 전 1회 실행용 감사 게이트로 "안전망"과 "서비스 운영 준비도"를 블로킹 수준으로 점검합니다. 법적·테스트·플레이북 3개 Section은 placeholder로 동봉되어 후속 PR에서 실구현됩니다.

### Added

- **`data/observability-platforms.yaml`** (new) — 11개 관측 플랫폼 카탈로그 (Sentry, Rollbar, Datadog, New Relic, PostHog, Amplitude, Plausible, Grafana Cloud, Axiom, OpenTelemetry, Vercel Analytics). `primary_category` / `pricing_tier` / `sdk_type` / `env_vars` / `compatible_frameworks` / `integration_template_path` 필드로 Wizard 필터링·랭킹·템플릿 방출을 지원.
- **`templates/integrations/sentry/`** (new) — 4개 PoC 템플릿: `nextjs-init.ts.template` (Next.js App Router instrumentation), `node-backend-init.ts.template` (Express/NestJS/Fastify), `error-boundary.tsx.template` (Sentry-backed React error boundary), `health-check.ts.template` (readiness endpoint with DB/cache 조건부 블록).
- **`templates/integrations/posthog/`** (new) — 2개 PoC 템플릿: `nextjs-init.ts.template` (PostHogProvider + pageview capture), `events-catalog.md.template` (이벤트 명명 규칙 + 핵심 이벤트 카탈로그).
- **`templates/integrations/README.md`** (new) — Wizard answer → template 매핑 표 + 토큰 규약 + 새 플랫폼 추가 가이드.
- **`skills/launch-check/SKILL.md`** (new) — 5-Section 출시 전 감사 게이트. Section 1 (안전망, verify 위임) 구현. Section 2 (서비스 운영 준비도, 7개 체크) 완전 구현. Section 3–5 (법적·테스트·플레이북) placeholder.
- **`data/agents.yaml`** — `observability` 도메인 + `observability-auditor` 에이전트 추가. 에러 캡처 유선·에러 바운더리·헬스 시그널·구조적 로깅·릴리스 태그·백그라운드 작업 계측 등 12개 key_concerns.
- **`data/guides.yaml`** — `observability` 도메인 + `observability-fundamentals` 가이드 추가 (3 pillars, 릴리스 트래킹, 에러 분류, 샘플링 전략, PII 스크러빙).
- **`scripts/validate-harness.js`** — `validateObservability` 함수 추가. project-config.yaml의 `observability` 섹션 구조 검증 + error_tracking 필수 여부 + env_vars 리스트 형식 + observability-auditor 에이전트 등록 확인.
- **`tests/observability-smoke.sh`** (new) — integration 템플릿 6개 전체에 대한 컴파일·토큰 치환·필수 API 서피스 체크 스모크 테스트.

### Changed

- **`skills/wizard/SKILL.md`** — Phase 4 에 Step D (Observability Stack Selection) 삽입. Q-D.1 에러 추적 필수, Q-D.2 프로덕트 분석 선택, Q-D.3 APM 선택 (has_backend 시). Phase 5 Step 5.1 에 observability 섹션 매핑 추가. Phase 5 Step 5.1c (integration 파일 방출) 신설 — 토큰 치환 + CONDITION 블록 해소 + .env.example 자동 확장.
- **`README.md`** / **`README-ko.md`** — 5 Skills → 6 Skills 테이블로 확장 (Launch-Check 추가). "Observability (required at wizard time)" 섹션 신설 (Wizard Phase 4 Step D 질문 내용 + 생성 파일 목록 + 사후 검증 에이전트 설명). "Pre-Launch Audit" 섹션 신설 (5 Section 상태 표 + Section 2 7개 체크 상세). 양문 100% 동기화 (712줄 일치).
- **Version bumps** — `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json` 모두 0.7.0 → 0.8.0.

### Known limitations

- `launch-check` Section 3 (법적 / 규정 준수) / Section 4 (테스트 완결성) / Section 5 (런북 & 플레이북) 는 현재 WARN 만 발생. 실제 BLOCK 로직은 각각 별도 P1 PR 로 추적: 법적 도메인 에이전트·가이드, `templates/e2e-patterns.md`·`contract-test-patterns.md`, `templates/playbooks/*.md`.
- observability 카탈로그 11개 플랫폼 중 현재 integration 템플릿 제공은 Sentry + PostHog 2개만. 나머지 9개는 선택 시 `TODO.md` 스텁 방출로 수동 연결 유도. Datadog / New Relic 템플릿은 follow-up.
- 기존 v0.7.x 로 생성된 harness 에는 observability 섹션이 비어 있음. `/harness-marketplace:upgrade` 가 observability backfill 을 자동 제공하는 경로는 별도 이슈로 추적 예정.

## [0.7.0] - 2026-04-16

### Highlights

Interview mode (`/project-interview`) — 다중 라운드 딥 서비스 인터뷰를 통해 종합 PRD를 생성하는 Phase -1 단계 추가. 도메인 전문가 에이전트 생성, 개발 팀 구성 정의, 10개 차원에서 구현 명확도 % 추적. 독립 모드 (`/project-interview`)와 파이프라인 모드 (`/project-harness interview`) 모두 지원.

### Added

- **`templates/interview.md`** (new) — multi-round deep service interview template. AI-driven multiple choice questions (4 options + custom input), model selection (Sonnet for Pro / Opus for Max), domain-expert agent creation via WebSearch deep research, development team composition, implementation clarity tracking across 10 dimensions. Produces `.claude/skills/project-harness/prd/service-prd.md`.
- **`templates/schemas.md`** — added `InterviewResult` schema for interview phase output contract.
- **`templates/handoff-templates.md`** — added `interview.md` handoff template for Phase -1 → Phase 0 state transfer.
- **`templates/config-schema.yaml`** — added `pipeline.interview` configuration section (model selection, clarity dimensions, expert agent settings).
- **`templates/progress-format.md`** — added interview phase progress display format (Phase -1 banner, clarity % visualization).
- **`templates/guide-injection.md`** — added interview worker → guide + agent mappings.
- **`prd/` directory** — new output directory for generated service PRD from interview mode.

### Changed

- **`templates/orchestrator.md`** — expanded with interview integration, updated pipeline diagram to include Phase -1, added interview entry in sub-skill table.
- **`templates/plan.md`** — enhanced interview result integration, plan phase reads InterviewResult when available.
- **`skills/wizard/SKILL.md`** — added `templates/interview.md` to template generation list, added `prd/` directory creation step.
- **`README.md`** + **`README-ko.md`** — added interview mode documentation: commands, pipeline flow, plugin structure. Both kept in sync.

## [0.6.0] - 2026-04-14

### Highlights

이 릴리즈는 v0.5.2 이후 6개 PR (#28, #30, #32, #34, #36, #38) 의 기능을 통합. 주요 추가 사항:

- **Orchestration-by-default** — wizard 가 프로젝트 루트 `./CLAUDE.md` 를 자동 생성하여 `/project-harness` 가 opt-in 이 아닌 기본 작업 방식이 됨 (#30)
- **실제 병렬 Fan-out/Fan-in** — PARALLEL REQUIRED directive + blockedBy 규약으로 Phase 1 / 4 / 7 / 2.5 워커들이 단일 메시지 내 복수 Task tool-use 로 진짜 동시 실행 (#36). Phase 7 기준 최대 10-14× wall-time 감소
- **Phase 2.5 `codebase-analysis`** — refactor 작업 전 arch / design / deps / impact 4차원 자동 분석 서브스킬 (#34 H2)
- **TDD implementation strategy** — Red-Green-Refactor 사이클, test-writer 먼저 실행 (#34 M1)
- **UI defect patterns** (static UI review) + **FSD scaffold patterns** — `has_ui` / `architecture=fsd` 조건부 활성 (#34 M2/M3)
- **Supabase security gate** — 17-point RLS / client / auth / storage / API 검증 agent + guide (#34 H1)
- **Monitor mode** — `/project-harness monitor --backend|--frontend` CronCreate 기반 idle 자동 감시 (#32)
- **11 reference files** — progress-format, ui-conventions, handoff-templates, schemas, guide-injection, monitor-mode, parallel-execution, tdd-implementation, ui-defect-patterns, fsd-scaffold-patterns, classification (#32, #34, #36)
- **Game domain 확장** — 4 신규 agents (gs-gacha-compliance, gs-integrity-auditor, t-game-api-architect, t-game-backend-engineer) + 5 guides (game-security, gacha-system, shop-iap, ranking-system, save-system) (#32 Stage C)

### Added — Enforce real parallel orchestration ([#35](https://github.com/aiAgentDevelop/harness-marketplace-plugin/issues/35))

Closes the "DESIGN-ONLY parallelism" gap identified after PR #34:
Fan-out/Fan-in was described with ASCII diagrams and prose ("병렬 실행",
"simultaneously") but **no concrete directive told Claude to spawn
workers in a single message with multiple Task tool-use blocks**. Without
that, Claude typically defaulted to sequential execution, losing the
wall-time benefit of team mode.

- `templates/parallel-execution.md` (new, 222 lines) — central reference
  explaining the single-message-multi-Task pattern with correct/forbidden
  code examples, blockedBy conventions, runtime constraints (rate limit
  batching, fallback), and a checklist of what each phase SKILL.md must
  contain to guarantee parallelism.

- `templates/plan.md` Phase 1/2 Reader Pattern section — adds "PARALLEL
  REQUIRED" subsection with a concrete js-flavored example showing 3-4
  Task calls in one message, and a forbidden sequential counterexample.
  blockedBy conventions: all explorers/validators → [], reader → depends
  on all fan-out tasks.

- `templates/implement.md` Phase 4 team-exec — hybrid classification.
  Parallel-eligible (blockedBy: []): scaffolder, test-writer (TDD Red),
  security-checker (has_security_surface), ui-checker (has_ui). Chained:
  implementer [scaffolder], integrator [implementer], test-runner
  [implementer, test-writer], build-checker [implementer]. Corrects
  previous "sequential order enforced via blockedBy" blanket statement.

- `templates/verify.md` Phase 7 team-verify — all auditors (4 fixed +
  up to 10 conditional) set to blockedBy: []. Single-message parallel
  spawn directive with example listing all conditional activation flags.
  Batch split via pipeline.parallel.max_per_message when auditor count
  exceeds the limit.

- `templates/codebase-analysis.md` Step 2 Fan-out — replaces prose Agent
  listings with concrete js array of 3 parallel Task calls per mode.

### Changed

- `skills/wizard/SKILL.md` Step 5.2 file list and Step 6.1 validation
  require `references/parallel-execution.md`.
- `skills/upgrade/SKILL.md` Step 2.6 treats parallel-execution.md as
  always-overwrite on upgrade (no user content).
- `templates/orchestrator.md` Related References paragraph gains
  parallel-execution.md link (file stays at 495 lines).
- `README.md` + `README-ko.md` Plugin Structure.

### Not changing

- Cross-phase parallelism (plan + visual-qa concurrent) — remains SERIAL
  by design. Each phase depends on the previous phase's handoff state.
- Team infrastructure (TeamCreate, SendMessage, TaskCreate/TaskGet,
  notepad) — already existed; this PR is pure directive additions.
- Existing projects — no behavior change until wizard re-runs OR
  `/harness-marketplace:upgrade` overwrites references.

### Expected wall-time impact

- Phase 1 (3 explorers): ~3× faster when parallel-spawn directive is followed
- Phase 4 independent workers (4 eligible): ~4× faster for the parallel portion
- Phase 7 (4 fixed + up to 10 conditional auditors): up to ~10-14× faster

Token cost roughly unchanged (same workers, same work). Wall-time
dramatically reduced.

### Added — Option Z: port skills_exsample improvements with wizard verification ([#33](https://github.com/aiAgentDevelop/harness-marketplace-plugin/issues/33))

5 items from `~/.claude/skills_exsample/` analysis. Each has explicit
wizard integration path + activation condition so wizard-generated
projects get exactly the right subset of additions.

**H1 — Supabase security gate**:
- New `supabase-security-gate` agent in `data/agents.yaml` (security
  domain, model: opus). 17-point deep checklist across Table / Client /
  Auth / Storage / API security. Binary PASS/BLOCK verdict. Complements
  existing auth-auditor + db-auditor which are general-purpose.
- New `supabase-security` guide in `data/guides.yaml` (development domain)
  with companion patterns for the 17 checks.
- Activation: `recommended_when: [has_database]` — wizard auto-checks
  when Supabase selected; user can deselect in Step 4.
- Wizard flow: Step 5.3 AI-generates `agents/supabase-security-gate.md`
  and `guides/supabase-security.md`. Step 6.1 validates presence.
- Verify integration: templates/verify.md Failure Tiers table gains
  supabase-security-gate row with BLOCK/WARN/INFO mapping.

**H2 — codebase-analysis sub-skill (Phase 2.5)**:
- New `templates/codebase-analysis.md` (226 lines) copied to
  `.claude/skills/project-harness/codebase-analysis/SKILL.md`.
- 4 analysis types: arch (FSD compliance, coupling, anti-patterns) /
  design (patterns, state, error) / deps (unused, vuln, outdated) /
  impact (direct/indirect importers, affected zones).
- Fan-out Explore agents + Fan-in reader worker per plan.md §Reader Pattern.
- templates/orchestrator.md gains Phase 2.5 stanza between Phase 0-3
  and Phase 3.5. Auto-trigger: `project_type == "refactor" AND
  pipeline.codebase_analysis.auto_on_refactor`. Manual: `--analysis-first`.
- templates/config-schema.yaml: new `pipeline.codebase_analysis` section
  with auto_on_refactor / default_type / archive_history / parallel_count
  / timeout fields.
- Wizard Step E6 question: "refactor 자동 분석?" (default yes).

**M1 — TDD implementation strategy**:
- New `templates/tdd-implementation.md` (276 lines) copied to
  `references/tdd-implementation.md` when
  `pipeline.implement_strategy != "standard"`.
- Red-Green-Refactor cycle with test-writer → implementer → refactorer
  worker chain replacing standard scaffolder → implementer → integrator.
- Framework-specific tooling: Vitest + Testing Library (FE), pytest
  or Vitest + Supabase mock (BE). Optional E2E via --e2e flag.
- templates/implement.md: new "Implementation Strategy Switch" section
  with standard/tdd/bdd enum + {{CONDITION:implement_strategy_tdd}}
  rendering logic.
- templates/config-schema.yaml: `pipeline.implement_strategy` enum
  (standard default).
- Wizard Step E5 question: "구현 전략? [standard/tdd/bdd]".

**M2 — UI defect patterns**:
- New `templates/ui-defect-patterns.md` (327 lines) copied to
  `references/ui-defect-patterns.md` when `flags.has_ui == true`.
- 8 static code-review patterns with bad/good examples + underlying
  mechanic: overflow, truncate, min-w-0 flex shrink, spacing
  inconsistency, vertical-align, responsive breakpoints, padding
  consistency, border-radius token adherence.
- Design system token enforcement section (color / spacing / radius /
  shadow / font-size).
- ui-checker (Phase 4) auto-fixes clear defects via Edit;
  ux-reviewer (Phase 7) read-only analysis feeds
  VerificationResult.conditional_checks.ux_review.
- Complementary to runtime visual-qa.md (not a replacement).
- templates/guide-injection.md: mapping updates for ui-designer (Phase 2),
  ui-checker (Phase 4), ux-reviewer (Phase 7).

**M3 — FSD scaffold patterns**:
- New `templates/fsd-scaffold-patterns.md` (386 lines) copied to
  `references/fsd-scaffold-patterns.md` when
  `tech_stack.architecture == "fsd"`.
- Entity / Feature / Widget layer scaffolds with concrete file templates:
  types.ts, queries.ts, mutations.ts (TanStack Query), Zustand store,
  UI Card, public API re-export hub.
- Public API encapsulation rule: external layers must import via module
  root index.ts, never internal files.
- scaffolder worker (Phase 4) loads this reference and auto-generates
  full module directory tree with TODO-placeholder boilerplate.
- templates/guide-injection.md: scaffolder row gains fsd-scaffold-patterns
  (conditional on architecture=fsd) in Phase 4 mapping + summary table.

### Changed

- `skills/wizard/SKILL.md`: Step 5.2 file list expanded (1 sub-skill +
  3 conditional references). Phase 2.5 gains Steps E5/E6. project-config.yaml
  construction step 15 writes pipeline.implement_strategy + pipeline.codebase_analysis.
  Step 6.1 validation requires new files.
- `skills/upgrade/SKILL.md`: new Step 2.6 handles Option Z additions on
  upgrade — 7 always-overwrite (no user content) + 3 conditional
  (re-evaluated per current flags) + supabase agent/guide prompts user.
- `templates/orchestrator.md`: Phase 2.5 codebase-analysis stanza inserted;
  Related References compacted to stay at 495 lines (under 500 threshold).
- `templates/config-schema.yaml`: new top-level `pipeline` section with
  implement_strategy (enum) + codebase_analysis (object with 5 fields).
- `templates/verify.md`: Failure Tiers mapping gains supabase-security-gate
  activation condition + BLOCK/WARN/INFO breakdown.

### File size discipline (all under 500 lines)

| New file | Lines |
|---|---|
| templates/codebase-analysis.md | 226 |
| templates/tdd-implementation.md | 276 |
| templates/ui-defect-patterns.md | 327 |
| templates/fsd-scaffold-patterns.md | 386 |
| templates/orchestrator.md (after edit) | 495 |

### Added — Port backup-harness UX/infrastructure/game-domain improvements ([#31](https://github.com/aiAgentDevelop/harness-marketplace-plugin/issues/31))

Stage A-D rollout porting proven patterns from the user's backup harness
(`~/.claude/skills-backup-harness/`) into generic marketplace templates.
All new markdown files kept under 500 lines; monitor mode lives in its
own reference file so `orchestrator.md` stays under the size threshold.

**Stage A — User-visible UX improvements**:
- `templates/progress-format.md` — standardized phase banners, status
  emoji (✅/🔄/⏳/❌/⏭️), worker tree, phase N/M counter. Consumed by all
  sub-skills for consistent progress display.
- `templates/ui-conventions.md` — 3-option confirmation gate standard
  (진행 / 수정 후 진행 / 중단) + bilingual completion summary schema
  (작업 정보 / 변경 요약 / 검증 항목별 결과 / 총 소요 시간).
- `templates/classification.md` — formal key:value output format rules
  (3-line groupings, pipe separator, `progress-format.md` conformance).

**Stage B — Pipeline infrastructure**:
- `templates/handoff-templates.md` — explicit `state/handoffs/{plan,
  debug,exec,verify}.md` structure for deterministic `--resume` recovery.
- `templates/schemas.md` — formal JSON contracts for `state/results/*.json`
  (PlanResult, DebugResult, ImplementationResult, VisualQAResult,
  VerificationResult). `schema_version` field + evolution rules.
- `templates/guide-injection.md` — worker → guide + technical agent
  checklist mapping. Phase-by-phase summary tables for all 11 domains.
- `templates/verify.md` — new **Failure Tiers** section (BLOCK / WARN /
  INFO) with regression-loop trigger rule (`BLOCK_count > 0`) and per-
  checker tier mapping.
- `templates/plan.md` — new **Reader/Fan-in Pattern** section explaining
  how parallel Phase 1/2 workers' results merge via a dedicated reader
  worker. Includes `fan_in_reader_threshold` config field.

**Stage C — Game domain expansion** (`data/agents.yaml`, `data/guides.yaml`):
- New agents: `gs-gacha-compliance` (JP/KR/CN gacha regulation),
  `gs-integrity-auditor` (server authority + anti-cheat + determinism),
  `t-game-api-architect` (Unity/Unreal client serialization),
  `t-game-backend-engineer` (stateless game server patterns).
- New guides: `game-security`, `gacha-system`, `shop-iap`, `ranking-
  system`, `save-system`. Covers game-specific threat model, gacha
  regulatory compliance, IAP/entitlement handling, competitive ranking,
  cross-device save integrity.

**Stage D — Monitor mode + generic patterns**:
- `templates/monitor-mode.md` — `/project-harness monitor --backend |
  --frontend` with CronCreate-based idle-mode loops. Backend: log tail
  + `/health` curl. Frontend: chrome-devtools MCP for console + network
  monitoring. Priority tiers (🔴 Critical / 🟠 High / 🟡 Medium / ⚪ Low).
- `templates/orchestrator.md` — adds short `Monitor Subcommand` stanza
  linking to `monitor-mode.md` (kept at 499 lines, under threshold).
- Notes on GP1 (System grouping for 5+ system projects) and GP2
  (Phase 3.5 API QA with Postman MCP) as future opt-in patterns.

### Changed

- `skills/wizard/SKILL.md` Step 5.2 — file generation expanded to copy
  all 7 reference files into `.claude/skills/project-harness/references/`.
  Step 6.1 validation requires all references present.
- `README.md` + `README-ko.md` — Plugin Structure lists new reference
  files under `templates/`. Both kept in sync per Documentation Rule.

## [Unreleased — older entries below]

### Added — Wizard generates project-root CLAUDE.md for orchestration-by-default ([#29](https://github.com/aiAgentDevelop/harness-marketplace-plugin/issues/29))

After wizard completes, the full orchestration scaffolding (`/project-harness` +
sub-skills + agents) is installed but nothing nudges the user or Claude Code
to actually invoke it. A bare "add feature X" chat message used to fall through
to direct editing with only hooks active, leaving Layers 2-3 (orchestration,
pipeline) scaffolded-but-dormant.

- `templates/CLAUDE.md.template` — project-root CLAUDE.md template. Declares
  `/project-harness` as the default entrypoint for non-trivial work, documents
  pipeline phases, hook enforcement table, stack conventions, and component
  location map. Uses HTML-comment `<!-- ═══ GENERATED ═══ -->` markers to
  separate auto-generated content from user-editable `## Custom Rules` section.
- `skills/wizard/SKILL.md` — new **Step 5.1b** between project-config.yaml
  write and template-based files generation. Checks for existing `./CLAUDE.md`
  and offers 3 options on collision: marker-merge (preserve Custom Rules) /
  full replace with backup / skip. Substitutes {{VAR}} and {{CONDITION:flag}}
  blocks from project-config.yaml + detected_stack + wizard state.
- `skills/wizard/SKILL.md` Step 6.1 — new validation item: project-root
  CLAUDE.md exists (unless skipped), contains markers, no unresolved {{...}},
  mentions `/project-harness` at least once.
- `skills/wizard/SKILL.md` Final Checklist — new line item for Step 5.1b.

### Changed — Wizard CLAUDE.md feature

- `skills/upgrade/SKILL.md` Phase 3 — new **Step 2.5** handling CLAUDE.md
  upgrade. Marker-based merge regenerates only GENERATED region, preserves
  everything below `<!-- ═══ END GENERATED CONTENT ═══ -->` (user's Custom
  Rules). Missing-marker case (hand-written CLAUDE.md or pre-v0.6 version)
  triggers AskUserQuestion: backup+replace or skip.
- `templates/hooks/session-init.sh.template` — adds 2-line orchestration tip
  before "Session ready" block, pointing terminal users at `/project-harness`
  as the entrypoint. Complements the CLAUDE.md guidance.
- `README.md` + `README-ko.md` — Plugin Structure adds
  `templates/CLAUDE.md.template` entry. "Use the generated harness" /
  "생성된 harness 사용" sections explain orchestration-by-default behavior,
  the generated CLAUDE.md contents, and collision handling.

### No new subAgent

CLAUDE.md generation is pure template rendering (substitution + conditional
blocks) using the wizard's existing template engine. Domain verify agents at
`wizard/SKILL.md` L953 remain independent — they spawn only during
`/project-verify` within the orchestration pipeline, not during wizard setup.

## [0.5.2] - 2026-04-13

### Fixed — upgrade skill polish (3 of 4 items from #22; `validate-harness.js` follows in a sibling PR)

Field-testing the v0.3.0 → v0.5.1 upgrade surfaced three rough edges in the
upgrade skill's inline YAML/template handling. None blocked the migration —
the user worked around each with ad-hoc Node scripting — but these make the
next `/harness-marketplace:upgrade` run cleanly without intervention.

- **YAML parsing — top-level key boundary detection** (bug 1). The previous
  SKILL.md guidance didn't specify what to do when an unrelated top-level key
  (e.g. `required_mcps:`) appeared after `guides:`. Section state stayed set to
  `guides`, so subsequent list items leaked into the guides array as
  `[object Object]` entries. `skills/upgrade/SKILL.md` Phase 3 step 1 now spells
  out the section-reset rule (unknown top-level key → `section = null`).
- **Template conditional substitution — full flag catalog** (bug 2). The set of
  `{{CONDITION:*}}` flags used by the hook templates grew beyond what the
  upgrade skill documented (added: `enforcement_protected_files`,
  `enforcement_secret_guard`, `enforcement_pattern_guard`, `has_lint`,
  `has_typecheck`, `has_formatter`, `fsd`, `clean_architecture`, `has_alembic`).
  SKILL.md now enumerates all 18 supported flags with their evaluation rules,
  plus the JSON-cleanup post-processing needed on `hooks-config.json` (strip
  empty lines and trailing commas, then `JSON.parse` + re-stringify).
- **Backup path — outside the skill scan range** (bug 3). Previous guidance
  placed the backup at `.claude/skills/project-harness.backup-{ts}/`, which
  Claude Code then attempted to register as a duplicate skill. Moved to
  `.claude/backups/project-harness-{ts}/` (outside `skills/`), with `mkdir -p`
  up front. Updated all three references (Phase 2 step 1, Phase 3 step 2 in two
  places, Phase 5 Rollback).

### Also fixed — `scripts/validate-harness.js` inaccuracies (bug 4 of #22)

Shipped under the same 0.5.2 release via a sibling PR. No separate version bump.

- **`visual-qa/scripts/visual-inspect.js` is no longer a conditional required
  file** (4a). The templates never shipped it — the optional helper is
  created on demand by the `visual-qa` skill, not at harness generation time.
  Removing the false positive prevents `has_ui=true` harnesses from failing
  validation for no good reason.
- **`serverless` is now an optional config field** (4b). Pre-v0.4.0 configs
  lack it (the wizard's serverless architecture question was added later),
  so treating it as required made every pre-v0.4.0 upgrade fail validation
  even when the harness was otherwise correct. Moved to the new
  `OPTIONAL_CONFIG_FIELDS` list (warn, don't error).
- **`config.guides[]` is now handled as objects, with legacy string fallback**
  (4c). Per `templates/config-schema.yaml:537-576`, guide entries are objects
  with `{ name, condition?, path? }`. The old validator treated them as
  strings and produced paths like `guides/[object Object].md`. Now extracts
  `guide.name` (falls back to the raw string for legacy configs), and emits
  a clear "Invalid guide entry (missing name)" error when neither shape works.

## [0.5.1] - 2026-04-13

### Added
- **`upgrade` skill detects and migrates legacy v1.x hooks** — When `/upgrade`
  runs on a project whose hooks-config.json still references
  `$CLAUDE_TOOL_INPUT_*` (the v1.x contract that became a silent no-op under
  Claude Code v2.x), the entire `hooks/` directory is replaced with the new
  v2.x templates. The Phase 2 backup remains the recovery path for any
  hand-edited Custom Rules.
- New Phase 1.5 in `skills/upgrade/SKILL.md` documents the detection logic
  and the user-visible warning shown before the replace.
- README / README-ko upgrade sections call out the auto-migration.

### Notes
- Normal v2.x → v2.x upgrades are unaffected — the marker-based partial
  replace (Generated vs. Custom Rules sections) still applies.
- The validator from #18 catches any half-migrated state during Phase 4.

## [0.5.0] - 2026-04-13

### ⚠️ BREAKING — Hook contract migration to Claude Code v2.x

Hooks generated by this plugin previously used the v1.x contract (`$1` argv input
and `exit 1` to block). Under Claude Code v2.x they were silent no-ops — every
guard rule in every existing harness was inactive. This release migrates all
hook templates to the v2.x contract (stdin JSON, `exit 2` to block).

If you have an existing project-harness installation, run `/upgrade` to detect
and migrate the legacy hooks (handled by a follow-up PR). The current PR only
ships the new templates for fresh wizard runs.

### Added
- **`templates/hooks/_parse.sh`** — shared helper that reads the v2 stdin JSON
  payload and exports `TOOL_FILE_PATH`, `TOOL_CONTENT`, `TOOL_COMMAND` for any
  hook to consume. Uses an inline Python parser (no `jq` dependency) and
  base64-encodes content/command to safely carry multi-line / special-character
  values through shell variables.
- **`templates/hooks/_log.sh`** — shared `log_block` helper that records every
  block event to `.claude/hook-blocks.log` (TSV, UTC ISO8601 timestamps).
- **`tests/hooks-smoke.sh`** — smoke test that compiles each template into a
  runnable script and exercises 20 cases (block + allow paths for all 4
  PreToolUse hooks plus exit-0 checks for PostToolUse / SessionStart hooks).

### Changed
- All 8 `templates/hooks/*.sh.template` files now `source` the helpers and read
  input from `TOOL_FILE_PATH` / `TOOL_CONTENT` / `TOOL_COMMAND` instead of `$1` /
  `$2`. PreToolUse hooks (protected-files, secret-guard, pattern-guard,
  db-safety) now `log_block` and `exit 2` on violations, with all stderr output
  routed to `>&2` so Claude actually receives it.
- `templates/hooks/hooks-config.json.template` no longer passes
  `$CLAUDE_TOOL_INPUT_*` as command-line arguments — Claude Code v2.x sends the
  full payload via stdin and the legacy env-var passing prevented the hooks
  from registering.
- `scripts/validate-harness.js` now enforces v2.x compliance: rejects
  hooks-config.json that contains legacy `$CLAUDE_TOOL_INPUT_*` references,
  requires `_parse.sh` and `_log.sh` to be present, and flags any blocking
  hook that still uses `exit 1` in its generated rules section. Also
  hardened the optional `yaml` module require with a try/catch fallback.
- `skills/wizard/SKILL.md` Step 5.6 documents the v2.x contract and adds the
  helper-copy step at the front of hook generation.
- README / README-ko Plugin Structure sections list the new helper files.

### Reference
- Issue #16 (root cause investigation)

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
