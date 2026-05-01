# Architecture

`harness-marketplace-plugin` 의 모듈 / 데이터 플로우 / 의존성 지도. 신규 컨트리뷰터·에이전트 모두 변경 영향 분석 시 이 문서를 1차 참조.

## Overview

이 plugin 은 사용자 프로젝트의 `.claude/skills/project-harness/` 위치에 **development-pipeline harness 스킬을 생성**하는 메타-도구다. 따라서 두 종류의 시스템이 공존:

- **Plugin 자체** (이 레포) — wizard / upgrade / launch-check / ci-cd / gh / learn 의 6개 SKILL.md 와 templates / data / scripts 로 구성
- **Generated harness** (사용자 레포 안) — wizard 가 출력한 result. 사용자 작업의 매 phase 에서 동작.

본 문서는 둘 다 다룬다.

## High-level data flow

Wizard 가 사용자 프로젝트에 harness 를 생성하는 전체 플로우:

```mermaid
flowchart LR
    subgraph Input["사용자 / 프로젝트 입력"]
        U[사용자 응답]
        P[기존 코드 / package.json]
    end

    subgraph Plugin["harness-marketplace-plugin"]
        D[data/*.yaml<br/>옵션 카탈로그]
        W[skills/wizard/SKILL.md<br/>3-mode entry]
        T[templates/<br/>skeleton]
        S[scripts/validate-harness.js<br/>merge gate]
    end

    subgraph Output["생성 산출물"]
        H[.claude/skills/project-harness/<br/>SKILL.md + 하위 skills]
        C[project-config.yaml]
        ST[state/<br/>runtime state]
    end

    U --> W
    P --> W
    D --> W
    W -->|render| T
    T --> S
    S -->|validated| H
    W -->|persist| C
    H --> ST

    classDef plugin fill:#eff6ff,stroke:#2563eb
    classDef output fill:#dcfce7,stroke:#16a34a
    class D,W,T,S plugin
    class H,C,ST output
```

`skills/upgrade` 는 동일한 templates / data 를 다시 읽어 사용자 레포의 harness 를 갱신하되, `project-config.yaml` 과 hook Custom Rules / state 는 보존한다.

## Three-layer architecture

이 plugin 이 만들어내는 harness 는 세 개 layer 의 합:

```mermaid
flowchart TB
    subgraph L1["Layer 1 · Hook Enforcement"]
        H1[PreToolUse hooks]
        H2[PostToolUse hooks]
        H3[Custom Rules section]
    end

    subgraph L2["Layer 2 · CI/CD Generation"]
        C1[GitHub Actions templates]
        C2[GitLab CI templates]
        C3[security / deploy / preview workflows]
    end

    subgraph L3["Layer 3 · Self-Learning"]
        S1[regression pattern detect]
        S2[learning-log.yaml]
        S3[새 hook rule 자동 추가]
    end

    L1 -.->|violation 발견 시 패턴 수집| L3
    L3 -.->|학습된 rule 을 hook 에 주입| L1
    L2 -.->|CI 결과를 학습 입력으로| L3

    classDef layer1 fill:#fef3c7,stroke:#d97706
    classDef layer2 fill:#eff6ff,stroke:#2563eb
    classDef layer3 fill:#dcfce7,stroke:#16a34a
    class H1,H2,H3 layer1
    class C1,C2,C3 layer2
    class S1,S2,S3 layer3
```

세 layer 는 독립적으로 동작하지만 self-learning 이 hook layer 를 시간에 따라 강화한다. CI 결과 (특히 verify phase 의 issue) 가 self-learning 의 입력.

## Module dependency graph

이 레포 내부의 8 개 module 간 의존 관계:

```mermaid
flowchart LR
    subgraph Skills["skills/"]
        WZ[wizard]
        UP[upgrade]
        LC[launch-check]
        CI[ci-cd]
        GH[gh]
        LR[learn]
    end

    subgraph Infra["검증 인프라"]
        SC[scripts/]
        TS[tests/]
    end

    subgraph Resources["Resources"]
        DT[data/*.yaml]
        TM[templates/]
    end

    subgraph Telemetry["측정"]
        BM[benchmarks/]
    end

    DT --> WZ
    DT --> UP
    DT --> CI
    TM --> WZ
    TM --> UP
    TM --> CI

    WZ --> SC
    UP --> SC
    SC --> TS
    BM -.->|효과 측정| WZ
    BM -.->|효과 측정| UP

    LC -.-> WZ
    LR -.-> UP
    GH -.-> UP

    classDef skill fill:#eff6ff,stroke:#2563eb
    classDef infra fill:#fef3c7,stroke:#d97706
    classDef resource fill:#dcfce7,stroke:#16a34a
    class WZ,UP,LC,CI,GH,LR skill
    class SC,TS infra
    class DT,TM resource
```

**해석**:
- `data/*.yaml` 은 wizard / upgrade / ci-cd 의 공통 입력 — 옵션을 추가하면 셋 다 갱신 가능성.
- `templates/` 도 동일.
- `scripts/validate-harness.js` 는 wizard / upgrade 의 머지-게이트.
- `benchmarks/` 는 wizard / upgrade 의 효과를 측정하는 메타-도구.
- `launch-check` / `learn` / `gh` 는 wizard 가 생성한 harness 가 사용하지만, plugin 측에서는 wizard / upgrade 의 보조 skill.

## Cross-module dependencies (text summary)

| 변경 위치 | 영향받을 가능성 큰 다른 위치 |
|---|---|
| `data/agents.yaml` 또는 `data/guides.yaml` 옵션 추가 | `skills/wizard/SKILL.md` (질문 추가), `skills/upgrade/SKILL.md` (재생성 룰), `scripts/validate-harness.js` (스키마 검증) |
| `templates/` 트리에 새 파일 | `skills/wizard/SKILL.md` (출력 매핑), `skills/upgrade/SKILL.md` (overwrite 룰), `scripts/validate-harness.js` (REQUIRED_FILES) |
| `scripts/validate-harness.js` 검증 룰 | `skills/wizard/SKILL.md` 와 `skills/upgrade/SKILL.md` 가 호출 — 룰 변경이 양쪽의 머지-게이트 통과율에 영향 |
| `.claude-plugin/plugin.json` version 변경 | `marketplace.json` + `package.json` + `CHANGELOG.md` 동시 갱신 ([ADR-005](adr/005-version-three-place-sync.md)) |
| README.md 변경 | `README-ko.md` 동시 갱신 ([CLAUDE.md](../CLAUDE.md) Documentation Rule) |

## See also

- [`../MEMORY.md`](../MEMORY.md) — 의사결정 인덱스 + 함정 모음
- [`adr/`](adr/) — 결정 근거 (ADR-001 ~ 005)
- [`../CLAUDE.md`](../CLAUDE.md) — 진입 컨텍스트 (Git identity, doc sync rule, 3-layer 요약)
- [`../scripts/CLAUDE.md`](../scripts/CLAUDE.md) — 검증 인프라 module ctx
