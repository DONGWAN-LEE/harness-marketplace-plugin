# Project Memory

이 파일은 `harness-marketplace-plugin` 의 **레포 차원 의사결정 / 컨벤션 / 회피해야 할 함정** 을 외부화한 store 입니다. 새 컨트리뷰터·에이전트 모두 이 파일을 1차 컨텍스트로 읽고 작업하십시오. 세부 결정 근거는 `docs/adr/` 의 ADR 시리즈 참조.

## Why this file exists

- **Note**: 의사결정 근거가 senior 머릿속에만 있으면, 신규 agent run 시 "왜 X 가 아니라 Y 인가" 를 매번 재설명해야 함 → 토큰 낭비 + 잘못된 path 답습.
- **Why**: 이 파일은 Claude Code 가 재시작해도 `git clone` 한 누구나 즉시 같은 정신 모델을 갖도록 만드는 *외부화* layer.

## Active decisions (cross-link to ADR)

| ADR | 결정 | 근거 한 줄 |
|---|---|---|
| [001](docs/adr/001-three-mode-wizard.md) | Wizard 3-mode (Deep Interview / Manual / Auto-Detect) | "all-things-to-all-people" 가 fail mode — 사용자 친숙도별 분기 |
| [002](docs/adr/002-file-based-state.md) | State 는 `state/` 디렉토리 내 파일로만 관리 (no omc, no DB) | 외부 dependency 0 — 어디서든 plugin 만 깔면 동작 |
| [003](docs/adr/003-korean-labels-direct.md) | UI 한글 라벨은 직접 작성, AI 번역 의존 금지 | 게이트성 메시지 (gateOn) 의 nuance 가 깨짐 |
| [004](docs/adr/004-issue-branch-pr-merge.md) | 모든 변경: Issue → Branch → PR → Merge | main 직접 푸시 = audit trail 손실 |
| [005](docs/adr/005-version-three-place-sync.md) | 버전은 `plugin.json` · `marketplace.json` · `package.json` 3곳 동시 갱신 | 누락 시 plugin manager 가 stale entry 보고 |

## Common gotchas (해 본 실수들)

- **Why** `plugin.json` 의 `skills` 필드를 비우지 말 것: 자동완성 (Claude Code `/` menu) 가 동작 안 함. Empty array 라도 명시.
- **Note**: `mcpServers: null` 은 plugin 설치 실패를 유발. 미사용 시 필드 자체 생략.
- **반드시**: `/reload-plugins` 는 skills 를 reload 하지 않음. 새 SKILL.md 추가 시 세션 재시작 필요 ([#35641](https://github.com/anthropics/claude-code/issues/35641)).
- **Gotcha**: README 재작성 시 `git diff` 로 제거된 섹션 검증 — 자동 압축 시 critical 섹션 (예: Comparison 표, Version history) 누락 빈번.
- **Don't**: `--no-verify` 로 hook 우회 금지. Hook 이 잡는 build / lint 는 PR 머지 전 마지막 게이트.
- **Important**: Generated 산출물 path (wizard 가 만들 `app/api/health/route.ts` 같은 것) 는 docs 내 narrative 의 inline backtick 으로 적지 말 것 — `\`\`\`text` 펜스 안에 넣을 것. AI-Readiness Gate 가 false-positive 로 이를 hallucinated path 로 잡음. 자세한 규약은 `docs/adr/` 와 PR template 참조.

## Conventions

- **Git identity**: 모든 commit 은 `aiAgentDevelop` 로. 로컬 `user.name` / `user.email` 은 repo-local 로 override (글로벌 건드리지 말 것). 검증: `git config --local user.name`.
- **Documentation sync rule**: `README.md` 와 `README-ko.md` 는 항상 동시 갱신. 한쪽만 바꾸면 안 됨.
- **CHANGELOG**: 모든 user-visible 변경은 `[Unreleased]` 에 한 줄. 버전 cut 시 release section 으로 promote.
- **Git workflow**: feature branch → PR. 머지 후 브랜치 삭제. main 의 force push 금지.

## Cross-module dependencies (overview)

전체 데이터 플로우와 모듈 간 의존성은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 의 mermaid 다이어그램 참조. 한 줄 요약:

- `data/*.yaml` → `skills/wizard` (질문 카탈로그) → `templates/` (보일러플레이트) → user repo 의 `.claude/skills/project-harness/` (생성된 harness)
- `skills/upgrade` 는 `templates/` 를 다시 읽어 user repo 의 harness 를 갱신 (Custom Rules 보존)
- `scripts/validate-harness.js` 는 wizard / upgrade 양쪽이 출력물 머지 직전 호출
- `benchmarks/` 는 plugin 자체의 효과를 측정 (harness 적용 vs 미적용 task 통과율)

## See also

- [`CLAUDE.md`](CLAUDE.md) — 진입 컨텍스트 (Git identity, doc sync rule, 3-layer 아키텍처)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 시스템 다이어그램
- [`docs/adr/`](docs/adr/) — Architecture Decision Records
- [`CHANGELOG.md`](CHANGELOG.md) — release history
