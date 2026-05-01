# Architecture Decision Records

이 디렉토리는 `harness-marketplace-plugin` 의 **architectural / process 의사결정** 을 기록합니다. 신규 결정마다 `NNN-short-slug.md` 로 새 파일을 추가합니다 (번호는 sequential, 파기/대체 시에도 번호 재사용 금지).

## Index

| ADR | 제목 | 상태 | 영향 영역 |
|---|---|---|---|
| [000](000-template.md) | ADR 템플릿 | (참조용) | meta |
| [001](001-three-mode-wizard.md) | Wizard 3-mode entry (Deep Interview / Manual / Auto-Detect) | Accepted | `skills/wizard/` |
| [002](002-file-based-state.md) | File-based state (no external deps, no omc) | Accepted | `state/`, generated harness runtime |
| [003](003-korean-labels-direct.md) | Korean UI labels written directly (no AI translation) | Accepted | `data/*.yaml`, wizard prompts |
| [004](004-issue-branch-pr-merge.md) | Issue → Branch → PR → Merge for all changes | Accepted | git workflow |
| [005](005-version-three-place-sync.md) | Version sync across plugin.json / marketplace.json / package.json | Accepted | release process |

## Why ADRs

- **Why**: 결정 근거가 PR 본문이나 senior 의 머릿속에만 있으면 6개월 후 "왜 이렇게 했지?" 답이 사라짐.
- **Note**: ADR 은 "결정의 근거 + 당시 alternatives + 예상 consequences" 를 한 묶음으로 보존 — 향후 "변경할까?" 결정 시 무엇을 trade off 하는지 명확.

## Conventions

- **Status** 는 `Proposed | Accepted | Superseded by ADR-NNN | Deprecated` 중 하나.
- 이미 Accepted 된 ADR 의 본문은 수정하지 않음. 변경이 필요하면 새 ADR 을 만들고 `Superseded by` 를 옛 ADR 에 추가.
- 작성 양식은 [`000-template.md`](000-template.md) 복사하여 사용.

## See also

- [`../../MEMORY.md`](../../MEMORY.md) — 모든 ADR 의 한 줄 요약 인덱스 (cross-link)
- [System architecture diagrams](../ARCHITECTURE.md) — 이 ADR 들이 묘사하는 시스템 자체.
