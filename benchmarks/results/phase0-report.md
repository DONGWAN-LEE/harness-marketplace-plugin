# Phase 0 A/B Pilot — 결과 보고서

**일자**: 2026-04-13
**브랜치**: `feat/14-phase0-benchmarks-infra`
**관련 이슈**: [aiAgentDevelop/harness-marketplace-plugin#14](https://github.com/aiAgentDevelop/harness-marketplace-plugin/issues/14)
**총 비용**: 서브스크립션 인증 (실 과금 없음)
**총 wall time**: 약 1시간 25분 (24-run batch) + 약 30분 (scoring)

---

## 1. Methodology

### 디자인
- **Stacks (2)**: `nextjs-supabase`, `fastapi-postgres`
- **Tasks per stack (3)**: basic / advanced / expert
- **Conditions (2)**: control (seed 만) vs treatment (seed + harness overlay)
- **Repeats**: N=2 (per task × condition)
- **Total**: 2 × 3 × 2 × 2 = **24 runs** (+ 1 sanity = 25)
- **Model**: `claude-sonnet-4-6` (via `claude -p`)
- **격리**: 각 run은 OS temp 디렉토리에서 격리 실행, 결과만 `benchmarks/results/raw/<run-id>/` 로 복사

### 측정 (per run)
1. **Automated checks** — task별 file_exists / file_contains / any_of 등 정적 검사
2. **Runtime checks** — pytest collect (가능한 경우) — 본 batch 에서는 .venv 부재로 SKIPPED
3. **LLM judge** — blind rubric 4차원 (code_quality, completeness, edge_cases, security), 0-10 점
4. **Hook blocks** — treatment 조건에서 hook이 차단한 이벤트 수 + 종류

### Treatment harness 구성 (양 stack 공통)
- `.claude/settings.json` 에 `PreToolUse` hooks 등록 (Edit/Write/Bash matchers)
- Hooks: `protected-files`, `secret-guard`, `pattern-guard`, `db-safety`, (nextjs 만) `post-edit-lint`
- Hook 입력은 stdin JSON, 차단은 `exit 2` (Claude Code v2.x 스키마)

---

## 2. 결과 — 집계 표

### 2.1 Stack × Condition (N=12 each, sanity 제외)

| Group | Auto% | Code Quality | Completeness | Edge Cases | Security | Hook Blocks |
|---|---|---|---|---|---|---|
| fastapi-postgres / control | 100.0% | 8.83 | 9.83 | 6.83 | 8.83 | 0 |
| fastapi-postgres / treatment | 100.0% | 8.83 | 9.83 | **7.67** | 8.83 | 2 |
| nextjs-supabase / control | 100.0% | 8.17 | 8.17 | 7.50 | 8.67 | 0 |
| nextjs-supabase / treatment | 97.6% | 7.67 | 8.33 | 7.00 | 8.33 | 2 |

### 2.2 Task × Condition (N=2 each)

| Task | Cond | Auto% | Q | C | E | S |
|---|---|---|---|---|---|---|
| fastapi-basic | control | 100% | 9.00 | 10.00 | 6.50 | 9.00 |
| fastapi-basic | treatment | 100% | 9.00 | 10.00 | **7.00** | 9.00 |
| fastapi-advanced | control | 100% | 8.50 | 9.50 | 8.00 | 9.00 |
| fastapi-advanced | treatment | 100% | 8.50 | 9.50 | **8.50** | 9.00 |
| fastapi-expert | control | 100% | 9.00 | 10.00 | 6.00 | 8.50 |
| fastapi-expert | treatment | 100% | 9.00 | 10.00 | **7.50** | 8.50 |
| nextjs-basic | control | 100% | 9.00 | 10.00 | 8.00 | 9.00 |
| nextjs-basic | treatment | 100% | 9.00 | 10.00 | 8.00 | 9.00 |
| nextjs-advanced | control | 100% | 9.00 | 10.00 | 8.00 | 9.00 |
| nextjs-advanced | treatment | 100% | 9.00 | 10.00 | 8.00 | **8.50** |
| nextjs-expert | control | 100% | **6.50** | **4.50** | 6.50 | 8.00 |
| nextjs-expert | treatment | **92.9%** | **5.00** | **5.00** | **5.00** | 7.50 |

### 2.3 Overall (24 batch runs, mean ± stdev)

| Condition | Auto% | Code Quality | Completeness | Edge Cases | Security |
|---|---|---|---|---|---|
| control (n=12) | 100.0% | 8.50 ± 0.96 | 9.00 ± 2.04 | 7.17 ± 0.90 | 8.75 ± 0.43 |
| treatment (n=12) | 98.8% | 8.25 ± 1.48 | 9.08 ± 1.89 | 7.33 ± 1.25 | 8.58 ± 0.64 |

---

## 3. Hook Block 집계 (treatment only)

| Run | Blocks | Hook |
|---|---|---|
| fastapi-advanced/n=1 | 1 | `secret-guard` (generic-secret in `app/auth.py`) |
| fastapi-advanced/n=2 | 1 | `secret-guard` (generic-secret in `app/auth.py`) |
| nextjs-advanced/n=1 | 1 | `secret-guard` (generic-secret in `app/api/posts/route.ts`) |
| nextjs-advanced/n=2 | 1 | `secret-guard` (generic-secret in `app/api/posts/route.ts`) |

- **트리거 빈도**: treatment 12 runs 중 4 runs (33%)에서 hook 차단 발생
- **트리거 패턴**: 모두 `secret-guard` — JWT/Supabase auth 코드 작성 중 하드코딩된 secret 패턴 감지
- **다른 hook**: `protected-files`, `pattern-guard`, `db-safety`, `post-edit-lint` 는 본 태스크 셋에서 자연 trigger 안 됨

---

## 4. 핵심 관찰

### 4.1 Treatment의 측정 가능한 효과
- **fastapi 스택 edge_cases**: control 6.83 → treatment **7.67** (+0.84, std 1.25). 셋 모두에서 일관된 +0.5~+1.5 개선.
- **Hook blocks**: secret-guard가 advanced 태스크에서 4건 차단. **harness가 보안 가드를 실제 강제함**을 입증.

### 4.2 Treatment의 효과 없음 / 역효과
- **nextjs 스택**: 거의 모든 차원에서 control과 동등하거나 미세하게 낮음. 표본 분산 범위 안.
- **Auto%**: treatment 1건 (nextjs-expert n=1) 6/7 — control 대비 1.2pp 하락. 단일 사건이라 통계적 의미 X.
- **Code quality 분산**: treatment(±1.48) > control(±0.96) — harness 자체가 분산을 키울 가능성 (small N).

### 4.3 nextjs-expert task의 양쪽 모두 저조
4 runs 중 4 runs 모두 judge sum 22-26점 (다른 태스크 평균 ~33).

원인 가설:
- Task spec("낙관적 동시성 제어 - like counter")이 expert 난이도에 비해 acceptance criteria가 추상적
- Claude가 짧은 응답으로 partial 구현만 제공 → completeness 점수가 4-6 권에 머무름
- task-checks.js의 검증이 통과해도 judge는 quality 차원에서 낮게 평가

→ Phase 1 진행 시 task spec 재작성 필요.

---

## 5. Variance & Threats to Validity

### Sample 크기
- **N=2** per cell — 분산 추정에 불충분. stdev 값들은 참고용.
- 통계적 유의성 검정 미수행 (N이 너무 작음).

### 단일 모델
- `claude-sonnet-4-6` 만 측정. Opus / Haiku 차이는 미관측.

### 태스크 도메인 한정
- 6개 태스크가 각 stack의 일반적 작업을 대표한다고 보기 어려움.
- 특히 hook 발동 이벤트가 advanced 태스크에서만 발생 — task 셋이 hook 효과 측정용으로 최적화되지 않음.

### Judge 신뢰성
- LLM judge (sonnet) 가 자체 출력을 평가하는 self-similarity 편향 가능.
- Blind 처리(condition 미공개)는 적용했으나 stack 정보는 prompt에 포함됨.

### Runtime check 미동작
- pytest collect 가 .venv 부재로 SKIPPED — runtime 에러는 측정되지 않음. 차후 환경 셋업 자동화 필요.

### 환경 차이
- Windows + Git Bash 환경. Linux/macOS 결과와 동일하다는 보장 없음.

---

## 6. Phase 1 권고

### 결론
**Phase 1 진행 권고 — 단, 스코프 재조정 필요.**

### 근거
1. **인프라가 동작함** — 24/24 runs 정상 종료, scoring 파이프라인 안정.
2. **유의미한 신호 1개 확인** — fastapi 스택 edge_cases 일관 개선 (+0.84 평균).
3. **Hook 효과 입증** — secret-guard 4건 차단 (auth 코드 작성 시 보안 가드 작동).
4. **약점 명확** — N=2는 불충분, nextjs-expert task spec 재작성 필요.

### Phase 1 으로 이월할 액션
1. **N 증대**: cell당 N=5 이상으로 확대 → 통계적 검정 가능
2. **Task 재설계**: nextjs-expert 재작성 + hook 발동 빈도가 더 균등한 task 셋 추가
3. **Runtime check 활성화**: 각 stack에 미리 빌드된 venv/node_modules 캐시 → pytest/jest 실행
4. **Multi-model**: Opus / Haiku 비교 추가
5. **Self-similarity 편향 완화**: judge model 을 다른 family로 (예: 외부 API)

### 별도 처리 (Phase 0 범위 외)
- **`templates/hooks/*.sh.template` 버그 수정** — 본 파일럿에서 사용한 `_parse.sh` + `exit 2` 패턴을 wizard 템플릿에 역이식. 별도 GitHub 이슈로 추적.

---

## 7. 데이터 위치

- **Raw artifacts**: `benchmarks/results/raw/<run-id>/` (25개 — 24 batch + 1 sanity)
  - `manifest.json`, `stdout.txt`, `stderr.txt`, `hook-blocks.log`, `project/` 스냅샷
- **Scored**: `benchmarks/results/scored/<run-id>.json` (automated) + `<run-id>.judge.json` (LLM judge)
- **Aggregated**: `benchmarks/results/aggregated.json` (집계 데이터, 본 표의 소스)
- **Logs**: `benchmarks/results/batch.log`, `benchmarks/results/scoring.log`

재집계 명령:
```bash
node -e "$(cat <<'EOF'
const fs=require('fs'),path=require('path');
const dir='benchmarks/results/scored';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.judge.json'));
const data=files.map(jf=>{
  const id=jf.replace('.judge.json','');
  const a=JSON.parse(fs.readFileSync(path.join(dir,id+'.json'),'utf8'));
  const j=JSON.parse(fs.readFileSync(path.join(dir,jf),'utf8'));
  return {id,...a,...j.scores};
});
console.table(data);
EOF
)"
```
