# harness-marketplace 업그레이드 가이드

> **[English](./UPGRADE.md)**

플러그인 자체 업데이트와 프로젝트 harness 업그레이드, 두 단계를 실제 절차와 함께 안내합니다.

---

## 한 눈에 보기 (TL;DR)

업그레이드는 **두 단계를 순서대로** 진행해야 합니다:

```
1. Claude Code 안에서 플러그인 업데이트   → /plugin 메뉴 → Update marketplace + Update plugin → 재시작
2. 각 프로젝트의 harness 업그레이드       → cd <project> && /harness-marketplace:upgrade
```

**Step 1을 건너뛰는 것이 "이미 최신 버전입니다"라는 오해의 주된 원인입니다.** 설치된 플러그인이 v0.3.0 이라면, 그 버전의 `/upgrade` 스킬은 원격에서 최신 템플릿을 가져올 줄 모릅니다. 그래서 캐시된 `plugin.json` (0.3.0)을 캐시된 `plugin.json` (0.3.0)과 비교하고 "이미 최신" 이라고 답합니다.

---

## 왜 두 단계인가?

두 작업이 업데이트하는 대상이 다릅니다:

| 단계 | 업데이트 대상 | 위치 | 빈도 |
|---|---|---|---|
| **플러그인 업데이트** | 플러그인 코드 자체 (wizard, upgrade 스킬, 템플릿 원본) | `~/.claude/plugins/cache/harness-marketplace/` | 릴리스당 1회 |
| **Harness 업그레이드** | 특정 프로젝트의 harness 파일 (SKILL.md, hooks, references) | `<project>/.claude/skills/project-harness/` | 프로젝트별 릴리스당 1회 |

보통은 둘 다 필요합니다. 플러그인만 업데이트하면 기존 프로젝트들의 skill 파일은 그대로이고, `/harness-marketplace:upgrade` 만 실행하면 업그레이드 스킬 자체가 구버전이라 새 템플릿을 이해 못 할 수 있습니다.

---

## Step 1 — 플러그인 자체 업데이트

### 방법 A: `/plugin` 메뉴 (권장)

Claude Code 세션 안에서:

1. `/plugin` 입력 후 Enter.
2. **Marketplaces** 로 이동.
3. **`harness-marketplace`** 선택.
4. **Update marketplace** 실행 — `marketplace.json` 을 재다운로드해서 Claude Code 가 새 버전 번호를 인식하게 합니다.
5. **Update plugin** 실행 — 실제 플러그인 코드를 캐시에 내려받습니다.
6. **Claude Code 를 완전히 재시작** (세션 종료 후 새로 시작). reload 만으로는 부족합니다 — 스킬과 hook 은 세션 시작 시점에 바인딩됩니다.

### 방법 B: Marketplace 제거 후 재추가 (폴백)

`/plugin` 메뉴에 업데이트 옵션이 없거나, 캐시가 꼬였을 때 사용:

```
/plugin marketplace remove harness-marketplace
/plugin marketplace add https://github.com/aiAgentDevelop/harness-marketplace-plugin.git
/plugin install harness-marketplace
```

그 후 Claude Code 재시작.

### 플러그인 캐시 버전 확인

재시작 후 실제로 새 버전이 디스크에 반영됐는지 확인:

```bash
# Linux / macOS / Git Bash
find ~/.claude/plugins/cache/harness-marketplace -name "plugin.json" -exec grep -H version {} \;
```

새 semver (예: `"version": "0.5.2"`) 가 보여야 합니다. 여전히 구버전이면 업데이트가 적용되지 않은 것 — 방법 B 로 재시도.

---

## Step 2 — 프로젝트 harness 업그레이드

프로젝트 디렉토리로 이동한 Claude Code 세션에서:

```
/harness-marketplace:upgrade
```

진행 과정:

1. **Phase 0** — 기존 `.claude/skills/project-harness/` 감지 + `project-config.yaml` 읽기.
2. **Phase 0.5** — GitHub 에서 최신 템플릿을 직접 fetch (v0.4.0+, PR #12). 오프라인이거나 fetch 실패 시 로컬 플러그인 캐시로 폴백 (`--offline` 플래그).
3. **Phase 1** — 어떤 파일이 교체되고 어떤 파일이 보존될지 preview 표시.
4. **Phase 1.5** — 레거시 v1.x hook 스캔 (v0.5.1+). 감지되면 `hooks/` 디렉토리를 **완전 교체 모드**로 처리.
5. **Phase 2** — `.claude/backups/project-harness-{timestamp}/` 에 타임스탬프 백업 생성. 모든 현재 파일이 변경 전에 복사됨.
6. **Phase 3** — 새 템플릿 적용. `project-config.yaml`, `agents/`, `guides/`, `state/` 는 보존; 스킬 파일과 hook 은 새 템플릿에서 재생성.
7. **Phase 4** — `scripts/validate-harness.js` 실행해서 구조적 문제 검사.
8. **마무리** — hook 엔트리를 `.claude/settings.json` 에 재머지할지 확인.

### 플래그

| 플래그 | 효과 |
|---|---|
| `--preview` | Phase 1 까지만 실행. 변경 계획만 보고 실제 수정 없음. |
| `--offline` | Phase 0.5 의 원격 fetch 건너뛰고 로컬 플러그인 캐시 사용. |
| `--backup-only` | Phase 2 (백업) 만 실행하고 중단. 위험한 수동 작업 전에 유용. |
| `<project-path>` | 다른 디렉토리에서 실행 (기본: 현재 작업 디렉토리). |

---

## 특별 안내 — v0.4.x 이하에서 업그레이드

**v0.5.0 은 hook 컨트랙트가 변경된 BREAKING 릴리스입니다.** v0.4.x 이하에서 생성된 hook 은 v1.x 컨트랙트 (`$1` 위치 인자, `exit 1` 차단) 를 사용합니다. Claude Code v2.x 에서 이 hook 들은 **silent no-op 상태** — 모든 기존 harness 의 가드 규칙이 작동하지 않습니다.

좋은 소식: v0.5.1 부터 업그레이드 경로가 자동화됐습니다.

### 자동 마이그레이션 동작 화면

`/harness-marketplace:upgrade` 가 레거시 hook 시그니처를 감지하면 이렇게 표시됩니다:

```
⚠️  Legacy v1.x hooks detected.

현재 hooks-config.json 에 $CLAUDE_TOOL_INPUT_* 환경변수가 포함되어 있고,
v2.x helper 스크립트 (_parse.sh, _log.sh) 가 누락되어 있습니다.
→ 이 hook 들은 Claude Code v2.x 에서 silent no-op 상태였습니다 (가드 규칙이
  발동하지 않음).
→ hooks 디렉토리를 full_replace 모드로 전체 재생성합니다. 커스텀 규칙이
  있었다면 backup 에서 수동으로 복사해야 합니다.
```

이 경고는 업그레이드가 올바르게 동작 중이라는 신호 — 그대로 진행하면 됩니다.

### 백업에 보존되는 내용

Phase 2 백업 (`.claude/backups/project-harness-{timestamp}/`) 에는 기존 harness 전체 복사본이 저장됩니다. 만약 hook 에 직접 수정한 Custom Rules 가 있었다면, 백업의 해당 파일을 열어서 `═══ CUSTOM RULES BELOW ═══` 아래 섹션을 새 v2.x hook 파일에 복사해야 합니다.

### settings.json 도 확인해야 함

Harness 의 `hooks-config.json` 은 자동으로 재생성되지만, `.claude/settings.json` (Claude Code 가 실제로 읽는 파일) 에는 여전히 구버전 command 라인이 남아있을 수 있습니다. 업그레이드가 이렇게 물어볼 때:

> `⚠️  settings.json 에도 레거시 v1.x hooks 가 남아있습니다. v2.x 형식으로 교체할까요?`

**Yes 를 선택하세요.** 이 단계를 건너뛰면 hook 스크립트 자체는 올바르더라도 hook 이 등록되지 않습니다.

---

## 업그레이드 검증

업그레이드 완료 후, Claude Code 가 실제로 hook 을 등록했는지 확인합니다.

### 1. 파일 존재 확인 (간단 sanity check)

```bash
# v2.x helper 가 있어야 함
ls .claude/skills/project-harness/hooks/_parse.sh \
   .claude/skills/project-harness/hooks/_log.sh

# hooks-config.json 에 레거시 env var 가 없어야 함
grep CLAUDE_TOOL_INPUT_ .claude/skills/project-harness/hooks-config.json
# 기대: 출력 없음

# settings.json 도 마찬가지
grep CLAUDE_TOOL_INPUT_ .claude/settings.json
# 기대: 출력 없음

# 차단 hook 은 exit 2 사용
grep -c "exit 2" .claude/skills/project-harness/hooks/protected-files.sh
# 기대: 1 이상
```

### 2. Claude Code 가 실제로 hook 을 등록했는지

디버그 로그를 켜고 새 세션 시작:

```bash
claude --debug-file /tmp/hook-debug.log
# 프롬프트가 뜨면 즉시 Ctrl+C
grep "Registered.*hooks" /tmp/hook-debug.log
# 기대: "Registered N hooks from M plugins" 에서 N > 0
```

N = 0 이면 settings.json 이 업데이트되지 않은 상태 — 업그레이드로 돌아가서 settings.json 머지 프롬프트에 "yes" 를 선택.

### 3. End-to-end — hook 이 실제로 차단

Claude Code 세션에서 다음 prompt 입력:

```
.env 파일을 만들어서 TEST_KEY=value123 을 넣어줘
```

정상 반응:

```
Error: PreToolUse:Write hook error: [bash .claude/skills/project-harness/hooks/protected-files.sh]:
[PROTECTED] File '.../.env' matches protected pattern '.env'.
```

Claude 가 이 메시지를 사용자에게 전달하고 `.env` 를 편집할 수 없다고 설명합니다. 만약 Claude 가 경고 없이 파일을 생성하면 hook 이 발동하지 않는 것 — 검증 단계 2 확인.

### 4. 차단 로그 엔트리

```bash
cat .claude/hook-blocks.log
```

기대: TSV 라인 (예: `2026-04-13T...Z  hook=protected-files  reason=builtin-pattern  extra=pattern=.env path=.env`). 이 파일은 첫 차단 이벤트 시 생성됩니다.

---

## Troubleshooting (문제 해결)

### "이미 최신 버전 (0.3.0) 입니다" 라고 나오는데 실제 latest 는 0.5.2
**원인**: Step 1 (플러그인 업데이트) 가 안 된 상태. 캐시된 플러그인이 여전히 v0.3.0 이라 그 버전의 `/upgrade` 스킬이 캐시-vs-캐시 비교를 함.
**해결**: Step 1 부터 진행. `/plugin → Update plugin` 이 안 되면 방법 B (marketplace 재추가) 사용.

### 업그레이드 후에도 "Registered 0 hooks"
**원인**: `.claude/settings.json` 이 여전히 구버전 command 형식 (`$CLAUDE_TOOL_INPUT_*`) 참조 중. Hook 스크립트 자체는 올바르지만, Claude Code 는 settings.json 을 읽음.
**해결**: `/harness-marketplace:upgrade` 를 다시 실행하고 "settings.json hook 엔트리 교체" 프롬프트에서 yes. 또는 `.claude/settings.json` 의 각 command 라인에서 `"$CLAUDE_TOOL_INPUT_*"` 인자 전달 부분을 수동 제거.

### Hook 은 발동하는데 Claude 에게 이유가 전달 안 됨
**원인**: Hook 스크립트가 stderr 대신 stdout 으로 출력하거나, `exit 2` 대신 `exit 1` 사용.
**해결**: Hook 이 v0.5.0+ 것인지 확인. `.claude/skills/project-harness/hooks/protected-files.sh` 를 열어서 상단에 `source "$(dirname "$0")/_parse.sh"` 가 있고, 차단 지점에 `echo "..." >&2; exit 2` 가 있는지 확인.

### 백업 디렉토리가 별개 skill 로 등록됨 (v0.5.1 및 이전)
**증상**: `/skills` 목록에 `project-harness.backup-20260413-...` 같은 항목이 나옴.
**원인**: v0.5.2 이전의 업그레이드 스킬이 백업을 `.claude/skills/` 안에 생성했음.
**해결**: 백업을 skill scan 범위 밖으로 이동 — `mv .claude/skills/project-harness.backup-* .claude/backups/`. v0.5.2+ 는 처음부터 `.claude/backups/` 에 생성.

### `/harness-marketplace:upgrade` 가 멈춰있거나 remote fetch 실패
**원인**: 네트워크 문제 또는 GitHub rate limit.
**해결**: `--offline` 플래그로 재시도해서 로컬 플러그인 캐시 사용. (Step 1 에서 캐시가 이미 최신이어야 함.)

### v1.x → v2.x 업그레이드 후 Custom Rules 가 보존되지 않음
**원인**: v1.x hook 은 보통 `═══ CUSTOM RULES BELOW ═══` 마커가 없어서 업그레이드가 generated-vs-custom 섹션을 자동 분리할 수 없음. full replace 모드는 보수적으로 동작하며 추측하지 않음.
**해결**: 백업 (`.claude/backups/project-harness-{ts}/hooks/<hook>.sh`) 을 열어서, 보존하고 싶은 규칙을 새 파일의 `═══ CUSTOM RULES BELOW ═══` 아래로 복사.

---

## Rollback (롤백)

업그레이드가 잘못 됐고 되돌리고 싶을 때:

```bash
# 1. 업그레이드된 harness 제거
rm -rf .claude/skills/project-harness

# 2. 백업에서 복원
mv .claude/backups/project-harness-{timestamp} .claude/skills/project-harness

# 3. settings.json 도 함께 교체됐다면 복원
ls .claude/settings.json.backup-*
mv .claude/settings.json.backup-{timestamp} .claude/settings.json

# 4. Claude Code 재시작
```

기존 v1.x hook 은 다시 silent no-op 상태가 되지만, 적어도 원래 상태로 돌아갑니다. 무엇이 잘못됐는지 https://github.com/aiAgentDevelop/harness-marketplace-plugin/issues 에 report 해주시면 고치겠습니다.

---

## 관련 링크

- [GitHub Releases](https://github.com/aiAgentDevelop/harness-marketplace-plugin/releases) — 버전별 릴리스 노트.
- [`CHANGELOG.md`](./CHANGELOG.md) — 저장소 내부 변경 이력.
- [Issue #16](https://github.com/aiAgentDevelop/harness-marketplace-plugin/issues/16) — v2.x hook 마이그레이션 배경.
- [Issue #22](https://github.com/aiAgentDevelop/harness-marketplace-plugin/issues/22) — v0.5.2 polish 항목들 (YAML 파싱, 템플릿 conditional, 백업 경로, validator).
- [`README-ko.md`](./README-ko.md) — 플러그인 개요 및 기능 문서.
