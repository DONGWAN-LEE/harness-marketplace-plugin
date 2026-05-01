# benchmarks/ — Phase 1 v2 (ISO 25010 + OWASP ASVS + DORA, 13-axis)

End-to-end benchmark comparing **Plain Claude Code** vs **project-harness** (v0.6.0 full wizard output) across the full development lifecycle, grounded in international standards.

> **Phase 0.5 note**: The previous benchmark (single-task, 10 tasks, N=2-3) was **deleted** in commit `0bc1940` per user decision (2026-04-13). To inspect historical Phase 0.5 artifacts, use `git show a455abe -- benchmarks/`.

## Directory Layout

```
benchmarks/
├── PROTOCOL-v2.md               # Pre-registered hypotheses + 13-axis weights + decision rules (FROZEN)
├── package.json                 # Node deps for runners + scorers
├── runner/                      # Invocation layer
│   ├── invoke.js                # stream-json wrapper around `claude -p`
│   ├── run-bare.js              # C1: plain claude -p, no seed
│   ├── run-claude-md-only.js    # C2: seed + project-root CLAUDE.md only
│   ├── run-harness.js           # C3: full wizard-generated harness
│   ├── run-sprint.js            # Sequential 8-task sprint runner (A3)
│   └── batch.js                 # Fan-out orchestrator w/ shuffle seed 20260413
├── scorer/                      # 13-axis scoring
│   ├── iso-25010.js             # Axes 1, 2, 5, 6, 7, 8, 12 (ISO 25010 characteristics)
│   ├── asvs-mapper.js           # Axis 3 (OWASP ASVS L2 coverage)
│   ├── cwe-classifier.js        # Axis 4 (CWE-weighted defect, via semgrep + heuristics)
│   ├── dora-metrics.js          # Axes 9, 10, 11 (DORA: lead time / CFR / MTTR)
│   ├── llm-judge.js             # Axes 12 (Usability), 13 (Over-engineering) — blind
│   ├── verify-blinding.js       # CI: reject judge prompts that leak condition labels
│   └── aggregate-v2.js          # Weighted total + winner table + radar data
├── tasks/
│   ├── owasp/                   # A2: 15 adversarial tasks (OWASP Top 10 2021)
│   ├── sprint-nextjs-supabase/  # A3: Sprint 1 (8 tasks, sequential)
│   ├── sprint-fastapi-postgres/ # A3: Sprint 2 (8 tasks, sequential)
│   └── sprint-game/             # A3: Sprint 3 (8 tasks, Full stage only)
├── external/
│   └── swebench/                # A1: SWE-bench Verified subset adapter
│       ├── sample.js            # Sample 20 of 500 (stratified, seed 20260413)
│       └── run-hidden-tests.js  # Judge-free pass/fail
├── reference-projects/          # Pre-built seed repos per stack
│   ├── bare/                    # empty, for C1
│   ├── claude-md-only-nextjs/   # seed + CLAUDE.md only
│   ├── claude-md-only-fastapi/
│   ├── harness-nextjs/          # wizard-completed project-harness
│   └── harness-fastapi/
├── results/
│   ├── raw/<run-id>/            # per-run output, cost, stream-json log
│   ├── pilot/
│   ├── slim/
│   └── full/
└── reports/
    ├── pilot-report.md
    ├── slim-report.md
    └── full-report.md           # 13-axis weighted table + radar + "Where harness loses"
```

## Quick start

```bash
# S0: verify protocol + blinding
node scorer/verify-blinding.js
node scorer/aggregate-v2.js --verify-weights  # asserts sum === 100

# S6: Pilot (A2 only — 15 tasks × 3 conditions × N=3 = 135 runs)
node runner/batch.js --stage pilot --seed 20260413

# Generate report
node scorer/aggregate-v2.js --stage pilot --out reports/pilot-report.md
```

## 13-axis weights (FROZEN per PROTOCOL-v2.md)

| Axis | Weight |
|---|---|
| Functional Suitability | 15% |
| Reliability | 12% |
| Security — ASVS L2 | 15% |
| Security — CWE-weighted | 10% |
| Maintainability | 10% |
| Perf — Wall-time | 6% |
| Perf — Cost | 6% |
| Compatibility | 6% |
| DORA Lead Time | 5% |
| DORA CFR | 3% |
| DORA MTTR | 3% |
| Usability | 5% |
| Over-engineering↓ | 4% |
| **Total** | **100%** |

## Budget (pre-registered)

| Stage | Runs | Time est. | Cost est. (USD) |
|---|---|---|---|
| Pilot (A2 only) | 135 | ~6h | ~$25 (ceiling $40) |
| Slim (+A1 easy/med) | ~250 | ~12h | ~$75 (ceiling $120) |
| Full (+A3 all sprints) | ~531 | ~40h | ~$250 (ceiling $350) |

See `PROTOCOL-v2.md` for decision rules on Pilot → Slim → Full escalation.

## Purpose

이 디렉토리의 owns: harness-marketplace plugin 자체의 효과를 정량 측정. harness 적용군 vs 미적용군의 task 통과율 / latency / 토큰 사용량을 비교해 plugin 의 ROI 를 수치화한다.

## Common modification patterns

- **새 평가 시나리오 추가** — `seeds/<scenario>.json` 신설 → `runner/render-seeds.js` 의 매핑 갱신 → `scorer/aggregate-v2.js` 가 새 시나리오를 집계에 포함.
- **새 metric 추가 (예: 코드 변경량 LOC)** — `scorer/judge-batch.js` 에 측정 로직 → `aggregate-v2.js` 의 통계 함수에 합치.
- **Reference project 추가** — `reference-projects/<name>/` 신설 → 각 reference 마다 `claude_md_only` / `full_harness` 두 변형 보유.

**Why:** benchmarks 는 plugin 의 변화가 실제로 사용자에게 효과가 있는지 검증하는 ground-truth — 측정 인프라 자체가 stale 하면 잘못된 결론을 confidence 있게 보고. **반드시** 변경 시 회귀 측정.

**Note:** `results/raw/` 는 `.gitignore` 처리 — 매 run 마다 GB 단위 산출물. 다음 산출물만 commit:

```text
results/aggregated.json
results/scored/*.json
phase05-report.md
```

## Cross-module dependencies

- `../skills/wizard/SKILL.md` — 측정 대상의 source. 이 skill 의 변경이 benchmark 결과에 영향.
- `../skills/upgrade/SKILL.md` — 측정 대상 (variant 비교).
- `../scripts/validate-harness.js` — reference-projects/ 의 generated harness 가 schema 에 맞는지 사전 검증.
- `../templates/` — reference-projects 의 full_harness variant 가 사용하는 source.

## See also

- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — 모듈 의존 그래프 (benchmarks 가 plugin 핵심을 측정하는 위치).
- `PROTOCOL-v2.md` (이 디렉토리 내부) — 평가 protocol 정의.
