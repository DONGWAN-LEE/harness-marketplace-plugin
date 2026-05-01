# ADR-002 — File-based state (no external deps, no omc)

## Status

Accepted

## Context

생성된 harness 는 다음과 같은 runtime state 를 보존해야 함:

- Pipeline 진행 상태 (어느 phase 까지 끝났는지, 어떤 task 들이 done/pending 인지)
- Phase 간 handoff 데이터 (plan → implement → verify 사이 산출물 전달)
- Phase 결과 (verify 의 issue 목록, debug 의 root cause 등)
- Self-learning 이력 (regression pattern 발견 시 hook 룰 누적)

선택지 후보가 여럿 있었음:
- 외부 state-management plugin (omc 류) 활용
- DB / SQLite 기반 store
- LocalStorage / IndexedDB 활용 (browser context)
- File-based: `state/*.json|.yaml`

이 plugin 은 임의의 사용자 환경에 설치되어야 — 사전 설치가 필요한 의존성은 채택률에 직접 영향.

## Decision

모든 runtime state 는 **생성된 harness 디렉토리 내부 file** 로만 관리:

- `state/pipeline-state.json` — pipeline 실행 상태
- `state/handoffs/` — phase 간 handoff 파일
- `state/results/` — phase 결과 파일
- `state/learning-log.yaml` — self-learning 이력

외부 의존성 (DB, plugin, runtime store) 일체 사용 금지.

## Rationale (Why)

**Why** file-based 인가:
- **Zero external dependency** — `git clone` + `claude code plugin install` 만으로 동작. DB / 다른 plugin 설치 절차 없음.
- **Inspectable / debuggable** — state 가 파일이라 사용자가 `cat`, `jq` 로 직접 확인 가능. 문제 발생 시 trace 가 파일 시스템에만 있음.
- **Idempotent / resumable** — 파일을 지우면 처음부터, 그대로 두면 이어서. checkpoint 의미가 명확.
- **Portable** — `state/` 를 통째로 복사하면 다른 머신에서 재개 가능. CI 의 caching 도 단순.

## Alternatives considered

- **omc state plugin** (rejected): omc 가 없는 환경에서 wizard 가 fail. omc 사용자는 일부 — 채택률 저하.
- **SQLite** (rejected): `sqlite3` 의존성 보장 못함 (Linux 서버는 OK 지만 Mac dev 환경 변수). 또한 `cat state.db` 가 안 됨 → 디버깅성 손실.
- **In-memory only** (rejected): Claude Code 세션이 재시작되면 진행 상태 손실. resumability 0.

## Consequences

- ✅ **Positive**: 어디서든 plugin 만 깔면 동작. Self-learning log 가 사람이 읽을 수 있는 YAML 이라 audit 가능.
- ✅ **Positive**: backup / rollback 이 파일 복사로 끝남 (`.claude/backups/project-harness-{ts}/`).
- ⚠️ **Negative**: 동시 다중 agent 가 같은 state file 에 쓰면 race. 현재는 wizard / upgrade / pipeline 모두 single-agent 가정 — 미래에 distributed 시 lock 필요.
- ⚠️ **Negative**: `.gitignore` 에 `state/` 추가 안 하면 runtime data 가 commit 됨. Generated harness 의 `.gitignore` 가 이를 처리.
- 🔄 **Implications**: state 스키마 변경 시 backward-compat 마이그레이션 함수 작성 — `skills/upgrade/SKILL.md` Phase 4 에서 처리.

## Cross-module dependencies

- 생성된 harness 의 `state/` 트리 — wizard 가 처음 생성, pipeline 의 모든 phase 가 read/write.
- `skills/upgrade/SKILL.md` Phase 3.4 — `state/learning-log.yaml` 절대 덮어쓰지 않음 (보존 룰).
- `scripts/validate-harness.js` — `state/` 디렉토리 생성 여부 검증.

## See also

- [ADR-001](001-three-mode-wizard.md) — wizard 가 state 를 처음 만드는 진입점.
- `skills/wizard/SKILL.md` Phase 5 (harness skeleton 생성).
- `skills/upgrade/SKILL.md` Phase 3.4 (self-learning 보존).
