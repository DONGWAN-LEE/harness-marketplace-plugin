# ADR-005 — Version sync across plugin.json / marketplace.json / package.json

## Status

Accepted

## Context

플러그인 버전은 세 곳에 명시되어 있음:

- `.claude-plugin/plugin.json` `version` — Claude Code plugin manager 가 읽음
- `.claude-plugin/marketplace.json` `version` — marketplace listing 의 표시 버전
- `package.json` `version` — Node tooling (예: scorer 의 stdlib 외 dev dep) 의 표준 버전 위치

세 위치는 의미가 다르지만 **항상 동일 값**이어야 사용자 환경에서 stale entry 보고가 발생하지 않음. 한 곳만 갱신 시 나타나는 증상:
- plugin manager 가 marketplace 에서 `0.7.0` 봤지만 plugin.json 은 `0.8.0` → "버전 mismatch" 경고
- npm 기반 도구 (e.g. release script) 가 `package.json` 만 보고 잘못된 git tag 생성

## Decision

세 파일의 `version` 필드는 **항상 동시에** 동일 값으로 갱신한다. 별도 자동화 도구 없이 PR 체크리스트로 강제.

## Rationale (Why)

**Why** 자동 단일 source 를 안 두는가:
- 세 파일은 각각 schema 가 다름 (plugin.json 은 Claude Code spec, marketplace.json 은 marketplace spec, package.json 은 npm spec). 자동 sync script 는 schema 변경 시 깨짐.
- PR 체크리스트로 "버전 변경 시 3곳 동기" 한 줄을 강제하는 것이 가장 단순. 변경 빈도 (release 당 1회) 가 낮음 — 자동화 cost > manual cost.

## Alternatives considered

- **Single source + script generates all 3** (rejected): release script 한 줄 추가로 가능하지만, 이 plugin 은 stdlib only 의 정신을 유지 — 별도 release 도구 의존하기 싫음. 또한 schema 가 변하면 script 가 stale 되기 쉬움.
- **No sync (each file independent)** (rejected): 위 Context 에서 본 stale-entry 증상이 발생.

## Consequences

- ✅ **Positive**: release process 가 단순. 3곳 grep 하면 끝.
- ✅ **Positive**: PR template 이 체크박스로 룰을 매번 환기.
- ⚠️ **Negative**: 사람 실수 가능. PR 체크리스트가 가장 마지막 방어선. CI 에 sync 검증 step 추가 가능 (todo: future ADR).

## Cross-module dependencies

- `.claude-plugin/plugin.json` — primary manifest, plugin manager 가 읽음.
- `.claude-plugin/marketplace.json` — marketplace listing 표시.
- `package.json` — npm tooling.
- `CHANGELOG.md` — release section heading 도 같은 버전 사용 (예: `## [0.8.1] - 2026-MM-DD`).
- `.github/pull_request_template.md` — 체크리스트 항목.

## See also

- [ADR-004](004-issue-branch-pr-merge.md) — release 도 일반 PR flow 를 따름.
- `CHANGELOG.md` — `[Unreleased]` → release section 으로 promote 시점이 곧 버전 갱신 시점.
