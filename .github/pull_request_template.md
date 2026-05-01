## Summary

<!-- 1-2 sentences: what changed and why. -->

## Category

<!-- Check one. -->

- [ ] skill (`skills/<name>/SKILL.md`)
- [ ] template (`templates/...`)
- [ ] data catalog (`data/*.yaml`)
- [ ] scripts / validators (`scripts/...`)
- [ ] documentation (`README.md`, `CHANGELOG.md`, `UPGRADE.md`)
- [ ] CI / governance (`.github/...`)
- [ ] other

## Impact

<!-- Which user-visible flows are affected? Wizard / upgrade / launch-check / generated harness output / CI? -->

## Verification

<!-- How did you verify this works? -->

- [ ] Ran affected wizard step locally end-to-end
- [ ] Validated harness output with `node scripts/validate-harness.js <out>`
- [ ] AI-readiness score did not regress (`python scripts/ai-readiness-score.py .`)
- [ ] Manual smoke (describe):

## Checklist

- [ ] `README.md` and `README-ko.md` are in sync (project rule)
- [ ] `CHANGELOG.md` `[Unreleased]` updated (if user-visible change)
- [ ] If version bumped: `plugin.json`, `marketplace.json`, `package.json` versions all match
- [ ] Generated-output paths in docs are inside fenced code blocks (\`\`\`text ... \`\`\`) — not narrative inline backticks — so the AI-Readiness Gate doesn't flag them
