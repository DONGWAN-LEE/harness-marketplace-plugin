# ADR-003 — Korean UI labels written directly (no AI translation)

## Status

Accepted

## Context

Wizard 의 사용자 대면 라벨 / 옵션 설명 (특히 Deep Interview mode 의 explanation) 은 대부분 한국어. 옵션은 `data/*.yaml` 에 정의되며 `label` (영어) + `description` (영어) + `label_ko` + `description_ko` 4개 필드 형태.

선택지가 둘:
1. `label` / `description` 영어만 작성하고, 런타임에 AI 가 번역 → `label_ko` / `description_ko` 자동 생성.
2. `label_ko` / `description_ko` 를 사람이 직접 작성하여 yaml 에 hardcode.

(1) 은 maintenance cost 적음 — 영어 한 본만 유지. 그러나 nuance 손실 위험 존재.

## Decision

`label_ko` / `description_ko` 는 **사람이 직접 작성**하여 yaml 에 hardcode 한다. AI 번역에 의존 금지.

## Rationale (Why)

**Why** 직접 작성인가:
- **gateOn 메시지의 nuance** — 보안 게이트, 머지 차단, 업그레이드 risk warning 등은 한국어 UX 에서 미묘한 어조 (반말 / 존댓말, 단호함 / 부드러움) 가 사용자 행동을 결정. AI 번역은 평균값으로 회귀 → "이게 진짜 위험한 거구나" 가 전달 안 됨.
- **재현성** — wizard 출력은 매번 동일해야 (테스트 가능, 비교 가능). 런타임 번역은 모델 / 버전 / temperature 에 따라 변동 → 회귀 가능성.
- **속도** — 번역 LLM call 이 wizard 전체 latency 의 큰 비중을 차지. 사전 작성하면 0ms.

## Alternatives considered

- **AI 자동 번역 + reviewer pass** (rejected): reviewer 가 결국 사람 — maintenance cost 동일하면서 회귀 추적성 (어떤 버전이 뭘 바꿨는지) 잃음.
- **`gettext` / `i18next` 외부화** (rejected): 외부 i18n 도구 의존 → ADR-002 의 zero-dep 원칙 위반.

## Consequences

- ✅ **Positive**: gateOn 메시지가 일관되고 단호. 사용자가 "이게 정말 막아야 하는 건가" 를 즉시 인지.
- ✅ **Positive**: 라벨 변경 = git diff 가능. PR 리뷰에서 단어 선택을 검토 가능.
- ⚠️ **Negative**: 옵션 추가 시 maintenance cost 가 2배 (영어 + 한국어 양쪽). YAML schema 검증으로 누락 방지.
- ⚠️ **Negative**: 다른 언어 추가 시 비용 2배 증가 — 다국어 확대 시점에는 재검토 필요.
- 🔄 **Implications**: PR template 의 "체크리스트" 에 한국어 라벨 동기 항목 명시. `scripts/validate-harness.js` 에 yaml 의 `_ko` 필드 누락 검증 룰 추가.

## Cross-module dependencies

- `data/agents.yaml`, `data/guides.yaml`, `data/options.yaml`, `data/observability-platforms.yaml` — 모두 `label_ko` / `description_ko` 필드 보유.
- `skills/wizard/SKILL.md` — Deep Interview mode 가 `description_ko` 를 표시.
- `scripts/validate-harness.js` — yaml 스키마 검증 시 `_ko` 누락 catch.

## See also

- [ADR-001](001-three-mode-wizard.md) — Deep Interview mode 가 한국어 explanation 의 주 소비자.
- `data/options.yaml` — 라벨 작성 양식의 예시.
