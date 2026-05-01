# ADR-004 — Issue → Branch → PR → Merge for all changes

## Status

Accepted

## Context

이 레포는 상대적으로 소규모 메인테이너 그룹과 다수의 AI agent 가 함께 작업. 변경 빈도가 높고, 어떤 변경이 어느 의도에서 발생했는지 추적이 잦음. main 직접 푸시는 빠르지만 다음을 잃음:
- "왜 이 변경이 일어났는가" 의 audit trail
- 자동 검증 (CI gate) 의 우회 가능성
- 코드 리뷰 (CODEOWNERS) 의 빠짐

## Decision

**모든 변경**은 다음 시퀀스를 따른다:

1. **Issue** — 변경 의도를 issue 로 기록 (single-line 도 OK, 단순 typo 는 예외 가능)
2. **Branch** — `feat/<slug>` / `fix/<slug>` / `docs/<slug>` 등 prefix-slug 컨벤션. main 에 직접 작업 금지.
3. **PR** — 브랜치를 push 하면 PR template 이 자동 채워짐 (Summary / Category / Impact / Verification / 체크리스트).
4. **Merge** — CI 통과 + CODEOWNERS 승인 후 merge. main 에는 squash-merge 또는 일반 merge.

## Rationale (Why)

**Why** issue 까지 강제하는가:
- **Audit trail** — 6개월 후 `git log` 만 보면 "어떤 issue 가 이 PR 을 motivate 했는가" 가 자연스럽게 연결됨. PR 본문이 issue 를 reference.
- **Discussion 분리** — 구현 대안 토론은 issue, 구현 자체는 PR. mixed 시 PR 리뷰가 산만.
- **CI gate 일관성** — main push 가 가능하면 일부 변경만 CI 를 거침. PR-only 강제는 100% gate 통과 보장.

## Alternatives considered

- **Branch + PR (issue 생략)** (rejected): 작은 typo 도 issue 만들기 부담 → issue 누락이 일상화. 정작 추적이 필요한 변경에서도 issue 가 없음. 그러나 trivial change 는 PR 본문에 "no issue (typo only)" 명시로 예외 허용.
- **Direct push to main with branch protection** (rejected): GitHub branch protection 이 PR 을 강제할 수 있지만, 그러면 결국 PR-only flow. 더 단순한 룰 (이 ADR) 로 통일.
- **Trunk-based development** (rejected): 매우 짧은 lifetime 의 feature branch 만 허용. wizard 같은 큰 기능은 통합에 시간이 걸려 trunk 에 incomplete state 가 머무름.

## Consequences

- ✅ **Positive**: PR 단위 audit, CI gate 100% 통과, CODEOWNERS 자동 review 요청.
- ✅ **Positive**: AI agent 가 main 을 깰 위험 0 (branch 만 작업).
- ⚠️ **Negative**: trivial change 에도 issue + branch + PR 오버헤드. 이를 완화하기 위해 trivial 케이스의 issue 생략을 명시적으로 허용.
- 🔄 **Implications**: `.github/pull_request_template.md` 가 체크리스트로 룰 강제. `.github/CODEOWNERS` 가 review 자동 요청.

## Cross-module dependencies

- `.github/pull_request_template.md` — 체크리스트로 룰 인식 강제.
- `.github/CODEOWNERS` — review 자동 요청.
- `.github/workflows/ai-readiness.yml` — PR 단위 AI-Readiness gate.
- `CLAUDE.md` (root) "Git Identity" 섹션 — agent 가 어떤 identity 로 commit 할지 확정.

## See also

- [ADR-005](005-version-three-place-sync.md) — release 단위 작업도 같은 PR 룰을 따름.
- `CONTRIBUTING.md` (todo: 작성 예정 — 본 ADR 의 룰을 기반으로).
