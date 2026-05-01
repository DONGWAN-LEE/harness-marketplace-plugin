# AI-Readiness — work log & backlog

이 레포 자체가 AI-Readiness v2 루브릭 (100점 · 7 카테고리) 으로 측정 가능하며, 어떻게 점수가 진화해왔는지 + 다음에 무엇을 할지 한 곳에서 정리.

## Status (current)

| 항목 | 값 |
|---|---|
| Total | **91 / 100** |
| Grade | **AI-Native** (top tier) |
| Hallucinated path refs | **0 / 86** |
| Modules | 8 (전부 컨텍스트 보유) |
| Context files | 11 |
| Branch (당시 main) | `main` @ commit `ad5108f` |
| Scored | 2026-05-01 |

CI gate (`.github/workflows/ai-readiness.yml`) + 로컬 husky pre-commit 이 모든 변경에 대해 broken context refs 임계 5 를 강제 — 회귀 자동 차단.

## Journey

| 시점 | PR | Δ | 점수 | 등급 | broken |
|---|---|---|---|---|---|
| 초기 (raw heuristic) | — | — | 26 | AI-Hostile | 242 (대부분 false-positive) |
| 스코어러 v2.1 (메타-도구 보정) | — | +19 | 45 | AI-Fragile | 38 |
| Track A bundle | [#53](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/53) | +12 | 57 | AI-Fragile | 0 |
| C/D foundations | [#55](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/55) | +30 | 87 | AI-Ready | 0 |
| Phase 2 (F + G) | [#56](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/56) | +4 | 91 | **AI-Native** | 0 |
| v0.9.0 release | [#57](https://github.com/aiAgentDevelop/harness-marketplace-plugin/pull/57) | 0 | 91 | AI-Native | 0 |

**Key shifts**:
- 초기 raw 26점은 메타-도구 (다른 repo 의 harness 를 *생성*하는 plugin) 라는 사실을 스코어러가 모른 결과 — 벤치마크 fixture 의 CLAUDE.md / templates/ 산출물을 본 레포 컨텍스트로 오인. v2.1 패치 (`results/raw/`, `reference-projects/`, `templates/`, `workdir`, `fixtures/` 트리 제외) 후 45점이 fair baseline.
- 큰 점프 (#55) 는 manual content 작성 (MEMORY.md + 5 ADRs + ARCHITECTURE.md mermaid 3종) 이 Cat C/D 를 한 번에 채움.
- #56 는 husky pre-commit 가 F.hook_validates_paths + E3.task_validation 동시에 hit 해 +3.

## Current scorecard

| Cat | Name | Score | Sub-scores / Evidence |
|---|---|---|---|
| **A** | Navigation & Coverage | **15 / 15** | 8 / 8 modules covered |
| **B** | Context Document Quality | **13 / 20** | B1=1 · B2=1 · B3=4 · B4=3 · B5=4 |
| **C** | Tribal Knowledge Externalization | **20 / 20** | Q1-Q5 모두 4/4 (만점) |
| **D** | Cross-Module Dependency Mapping | **13 / 15** | ARCHITECTURE.md ✓ · mermaid ✓ · 11 ctx with deps section · workspace ✗ (N/A) |
| **E** | Verification & Quality Gates | **15 / 15** | E1=5 · E2=4 · E3=4 · E4=2 (총합 15 cap) |
| **F** | Freshness & Self-Maintenance | **10 / 10** | drift 0% · CI workflow ✓ · husky ✓ |
| **G** | Agent Performance Outcomes | **5 / 5** | benchmarks/ ✓ · agent-results.json ✓ · telemetry hint ✓ |

**약점 위치 (B)**:
- B1 Conciseness 1/4 — 9 개 ctx 파일이 100줄 초과 (README.md 843, skills/ci-cd 252, skills/launch-check 320, skills/upgrade ~500, etc.)
- B2 Quick commands 1/4 — bash 코드블록 부족

## Backlog (ranked by ROI)

### Group 1 · B-readability (이 레포 내부)

| # | Effort | Cat | Action | Δ | 비고 |
|---|---|---|---|---|---|
| 1 | M 2-3h | B | `README.md` 843 → ~100줄 + `docs/USAGE.md` · `docs/INSTALL.md` 분리 | +3 | 메모리 룰 "재작성 시 git diff 로 제거된 섹션 검증" 적용. README + README-ko 동기. |
| 2 | M 2h | B | 6개 SKILL.md 끝에 `## Quick commands` bash fence 블록 추가 (B2 1/4 → 4/4) | +3 | 각 SKILL.md 의 핵심 호출 명령 4-5개. |
| 3 | M 1.5h | B | 긴 SKILL.md (skills/upgrade, skills/launch-check) 압축 — 중복 섹션 제거 | +2 | C/D 헤더는 유지 (점수 회귀 방지). |
| 4 | S 0.5h | B | benchmarks/README.md 127줄 압축 / Why-Note 마커 균형 | +1 | B4 3/4 → 4/4 가능. |

**합산**: ~6h, +9 가능 → **B 13 → ~19**, total **91 → ~100** 잠재. 단 heuristic 매칭 실패 risk 로 실제 +6-8 추정.

### Group 2 · 스코어러 enhancement (이전 트랙 B)

| # | Effort | 영향 | 비고 |
|---|---|---|---|
| A | M 4h | 다른 모든 레포 평가 | `score.py --render-html out.html` 자동 dashboard 렌더 — LLM 손-페인팅 의존 제거. |
| B | M 2h | meta-tool 정확도 | `## Generated Output` 섹션 마커 인식 → 그 아래 path 자동 fence 처리. narrative 인라인 generated path 도 false-positive 면제. |
| C | M 2h | F.drift 정밀도 | git log 기반 last-touch 비교로 mtime heuristic 보강. |
| D | S 1h | E4 점수 유연성 | E4 의 binary heuristic 을 prompt-test 파일 카운트 기반 스케일링으로 변경 (현재 2/3 천장 → 0/3 ~ 3/3). |

**Note**: Group 2 는 user-scope skill (`~/.claude/skills/ai-readiness-cartography/scripts/score.py`) + 이 레포의 vendored `scripts/ai-readiness-score.py` 양쪽 동기 패치 필요. 이 레포 점수에 직접 영향은 거의 없음 (이미 천장 근처).

### Group 3 · 단발 마무리

| # | Effort | Action | Why |
|---|---|---|---|
| α | S 0.2h | `gh release create v0.9.0 --generate-notes` | GitHub releases 페이지 활성, plugin manager 일부 환경에서 release tag 기반 detect. |
| β | S 0.5h | HTML 대시보드 재생성 → `.claude/ai-readiness-map.html` (현재 26점 기반 stale) | 의사결정용 시각화 갱신. 다른 사람 공유용. |
| γ | S 0.5h | CI gate 임계 5 → 0 으로 ratchet down | broken=0 가 안정화됐으니 점진적 strictness. PR template 의 fence 룰 학습 후. |

## Reproduction

### 점수 재측정 (로컬)

```bash
PYTHONIOENCODING=utf-8 python scripts/ai-readiness-score.py . \
    --json .claude/ai-readiness-score.json
```

stdout 에 markdown 요약, JSON 에 raw 점수.

### Pre-commit gate (husky)

```bash
npm install   # husky install 트리거 — .husky/pre-commit 활성화
git commit    # 매 commit 마다 broken refs ≤ 5 검증
```

Python / scorer 미설치 환경에서는 silent skip.

### CI gate

`.github/workflows/ai-readiness.yml` 가 모든 PR + main push 에 fire. `broken > 5` 면 fail. JSON scorecard 가 30일 artifact 보관.

## See also

- [`MEMORY.md`](../MEMORY.md) — 의사결정 인덱스
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — 시스템 다이어그램 (mermaid 3종)
- [`adr/`](adr/) — Architecture Decision Records (ADR-001 ~ 005)
- [`../CHANGELOG.md`](../CHANGELOG.md) — release history
- AI-Readiness 스킬 본체: user-scope `~/.claude/skills/ai-readiness-cartography/` (vendor 사본은 `scripts/ai-readiness-score.py`)
