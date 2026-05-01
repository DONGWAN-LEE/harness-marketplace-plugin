# scripts/

플러그인 무결성 검증 + harness merge 유틸. wizard / upgrade flow 의 머지-게이트.

## Purpose

- 출력된 harness 가 `.claude-plugin` spec 에 부합하는지 구조·스키마 수준에서 검증
- hook 설정을 user 의 기존 `settings.json` 에 안전하게 병합

## Files

- `validate-harness.js` — 생성된 `project-harness/` 스킬의 구조 / config 스키마 검증. Node.js 또는 Chrome DevTools MCP `evaluate_script` 로 실행.
- `merge-hooks.js` — wizard 가 만든 hook 설정을 사용자 기존 hooks 에 idempotent 하게 병합.

## Quick commands

다음은 `scripts/` 자체에서 실행하는 명령. 검증 대상 경로는 인자.

```bash
node scripts/validate-harness.js <generated-harness-root>
node scripts/merge-hooks.js <project-root>
```

## Why

wizard 산출물은 user repo 에 직접 쓰여지므로 머지 직전 게이트가 없으면 schema drift 가 곧장 user 환경 손상으로 이어짐. 이 module 은 메인 wizard flow **외부의** 검증 인프라.

## Common modification patterns

- **새 검증 룰 추가** — `validate-harness.js` 의 `REQUIRED_FILES` / `CONDITIONAL_FILES` 갱신 + `tests/` 에 회귀 케이스 추가.
- **wizard 산출물 schema 변경** — wizard / upgrade SKILL.md 의 출력 매핑과 함께 갱신, validator 의 검증 룰도 동시 갱신 (stale 검증은 잘못된 PASS 를 반환).
- **AI-readiness 스코어러 (vendored) 패치** — user-scope 의 본체와 이 레포의 vendored 사본을 양쪽 동기. 동기 대상:

  ```text
  ~/.claude/skills/ai-readiness-cartography/scripts/score.py    (user-scope, 본체)
  scripts/ai-readiness-score.py                                  (repo-vendored, CI gate 가 사용)
  ```

  한쪽만 패치하면 CI gate 가 로컬 결과와 어긋남.

**Why** 별도 patterns 섹션이 필요한가: validator 와 wizard 의 schema drift 가 가장 흔한 회귀 원인. 변경 시 항상 이 대응 표를 보고 진행하면 stale validator 함정을 피함.

## Cross-module dependencies

- `../skills/wizard/SKILL.md` — `validate-harness.js` 를 머지-게이트로 호출. 출력 schema 가 이 validator 의 룰과 일치해야 함.
- `../skills/upgrade/SKILL.md` — 동일 validator 를 upgrade flow 에서 재사용.
- `../tests/` — validator 자체의 회귀 테스트.
- `../templates/` — validator 가 검증하는 출력의 source. 새 template 추가 시 `REQUIRED_FILES` / `CONDITIONAL_FILES` 동기.
- `../.github/workflows/ai-readiness.yml` — `ai-readiness-score.py` 를 CI step 으로 실행.

## See also

- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — 전체 의존성 그래프.
- [`../MEMORY.md`](../MEMORY.md) — 함정 모음 (validator 관련 항목 포함).

## Note

wizard 산출물 (`templates/` 트리, `data/agents.yaml` 등) 변경 시 `validate-harness.js` 의 `REQUIRED_FILES` / `CONDITIONAL_FILES` 도 함께 업데이트. **반드시** 누락 없이 동기 — stale validator 가 잘못된 PASS 를 반환하는 함정.
