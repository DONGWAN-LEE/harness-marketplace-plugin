# ADR-001 — Wizard 3-mode entry (Deep Interview / Manual / Auto-Detect)

## Status

Accepted

## Context

`/harness-marketplace:wizard` 는 임의의 사용자 프로젝트에 대해 development-pipeline harness 를 생성합니다. 입력으로 받아야 하는 정보가 매우 많음:
- 기술 스택 (frontend / backend / DB / monorepo 여부)
- 보유 기능 (`has_ui`, `has_backend`, `has_observability` 등 약 20개 flag)
- CI / CD 플랫폼, agent / guide 카탈로그 선택
- 의사결정 nuance (보안 강도, TDD 전략, observability 사용)

사용자 친숙도 스펙트럼이 매우 넓음:
- "처음 시작 — 뭘 정해야 하는지조차 모름"
- "이미 명확한 요구사항 / config 가 손에 있음"
- "기존 레포에 적용 — 코드 자체가 답을 가짐"

단일 prompt 시퀀스 하나로 셋 다 만족시키려 하면 **all-things-to-all-people fail mode** 발생: 초보는 압도되고, 익숙한 사용자는 시간 낭비하고, 자동화 적용군은 사람 응답을 기다리느라 멈춤.

## Decision

Wizard 진입을 **3개의 명시적 mode** 로 분기:

1. **Deep Interview** — 처음 사용자. 각 결정마다 "왜 이게 중요한가" 설명 + alternatives 선택지 제시. 시간이 걸리지만 학습이 됨.
2. **Manual** — 익숙한 사용자. config preset 또는 직접 입력으로 빠르게.
3. **Auto-Detect** — 기존 레포. `package.json` / `pyproject.toml` / 디렉토리 구조를 스캔해 답을 추론, 사람은 confirm 만.

각 mode 는 wizard SKILL.md 의 다른 entrypoint section 에서 시작하지만, Phase 1 이후의 generation pipeline 은 동일 (config dict 만 채워지면 통합).

## Rationale (Why)

**Why** 단일 mode 가 아닌 분기 인가:
- 사용자 응답 시간 대비 정확도 trade-off 가 mode 별로 다름. 하나의 prompt 로 셋 다 만족시키려면 항상 절충점에 머무름.
- Auto-Detect 는 인간 응답을 거의 요구하지 않음 → CI/CD 에서 호출 가능 (별도 fully-automated path 가 필요).
- Deep Interview 는 학습 outcome 도 같이 제공 — wizard 자체가 onboarding 자료가 됨.

## Alternatives considered

- **Single configurable wizard** (rejected): `--depth=quick|deep` 플래그로 동일 wizard 분기. → 코드 분기가 wizard 내부에 분산되어 prompt 가 복잡해지고 testability 떨어짐.
- **Auto-Detect only + manual override** (rejected): 모든 사용자에게 자동 추론 → 신규 프로젝트 (코드 없음) 에서 실패. 학습 효과도 사라짐.
- **External UI** (rejected): 별도 webapp 으로 wizard 제공. → plugin 은 stdlib only 의도와 충돌. 사용자가 별도 도구 설치를 원치 않음.

## Consequences

- ✅ **Positive**: 사용자 페르소나별 friction 최소화. Deep Interview 는 학습 자료, Manual 은 빠름, Auto-Detect 는 CI 가능.
- ✅ **Positive**: mode 별 prompt 시퀀스가 분리되어 testability 높음 (`tests/` 의 wizard 검증이 mode 단위로 독립).
- ⚠️ **Negative**: SKILL.md 가 길어짐 (3개 entrypoint 분기). Phase 1 까지의 prompt 는 mode 별로 다르게 유지해야 함.
- 🔄 **Implications**: 새 question 추가 시 3개 mode 모두 업데이트 — Deep Interview 에는 explanation 추가, Manual 에는 short prompt, Auto-Detect 에는 추론 룰. `data/options.yaml` 에 mode-별 라벨이 함께 들어감.

## Cross-module dependencies

- `skills/wizard/SKILL.md` — 3-mode 분기의 본체.
- `data/*.yaml` — 각 옵션 정의에 `label_ko` / `description_ko` (Deep Interview 용 explanation) 동봉.
- `templates/CLAUDE.md.template` — wizard 가 채울 변수 셋트는 mode 와 무관 (Phase 1 이후 통합 후 동일).

## See also

- [ADR-003](003-korean-labels-direct.md) — 한글 라벨 직접 작성 (Deep Interview 의 explanation 정확도 보장)
- `skills/wizard/SKILL.md` Phase 0 (mode selection)
