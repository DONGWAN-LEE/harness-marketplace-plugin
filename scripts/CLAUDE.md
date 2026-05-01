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

## Cross-refs

- `../skills/wizard/SKILL.md` — 이 검증기를 호출하는 wizard.
- `../skills/upgrade/SKILL.md` — 업그레이드 시 동일 validator 재사용.
- `../tests/` — validator 자체의 회귀 테스트.

## Note

wizard 산출물 (`templates/` 트리, `data/agents.yaml` 등) 변경 시 `validate-harness.js` 의 `REQUIRED_FILES` / `CONDITIONAL_FILES` 도 함께 업데이트. 누락하면 stale validator 가 잘못된 PASS 를 반환.
