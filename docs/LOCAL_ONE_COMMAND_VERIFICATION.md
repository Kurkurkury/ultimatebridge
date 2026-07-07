# Local One-Command Verification V1

This branch adds a single local verification command for the UltimateBridge PR workflow.

## Purpose

The previous workflow required manually running many individual commands and copying a huge terminal log back into ChatGPT.

This command compresses that workflow into one local command:

```powershell
npm run verify:local
```

It runs the full local verification stack in order and writes compact proof artifacts.

## Output artifacts

```text
artifacts/local-verification/latest.json
artifacts/local-verification/latest.md
```

`latest.md` is intended to be uploaded or pasted into ChatGPT / PR comments.

## Verification stack

The command runs:

```text
npm test
npm run smoke:browser-root-aware-popup-wiring
npm run smoke:browser-root-aware-command-templates
npm run smoke:browser-project-root-labels
npm run smoke:browser-project-root-memory
npm run smoke:browser-command-templates
npm run smoke:browser-session-summary
npm run smoke:browser-final-review-checklist
npm run smoke:browser-artifact-open-plan
npm run smoke:browser-diff-viewer
npm run smoke:browser-roundtrip-panel
npm run smoke:full-browser-roundtrip
npm run smoke:manual-send-guard
npm run smoke:browser-apply-injection
npm run smoke:browser-safe-change-builder
npm run smoke:extension-preview-ui
npm run smoke:preview-apply
npm run smoke:preview-diff
npm run smoke:rollback
npm run smoke:project-roots
npm run smoke:safe-change
npm run smoke:readonly
npm run smoke:delivery
npm run smoke:extension-queue
npm run smoke:confirmed-plan
npm run e2e:native
pwsh -NoProfile -File scripts/check-powershell.ps1
```

## Behavior

- Runs checks sequentially.
- Stops at the first failing command.
- Streams normal command output to the console.
- Writes `latest.json` and `latest.md` after every step, so partial failure proof still exists.
- Includes command labels, exit codes, durations, stdout tail, stderr tail, host, platform, cwd, and Node version.

## Success proof example

```text
# UltimateBridge Local Verification

status=PASS
passed=27
failed=0
```

## Failure proof example

```text
# UltimateBridge Local Verification

status=FAIL
failure=npm run smoke:browser-root-aware-popup-wiring
```

## New workflow

For each PR branch:

```powershell
git fetch origin
git checkout <branch>
git pull origin <branch>
npm run verify:local
```

Then upload or paste:

```text
artifacts/local-verification/latest.md
```

## Safety

This command only runs the existing test/smoke/e2e verification commands. It does not modify GitHub, merge PRs, send browser messages, apply browser actions, upload artifacts, or bypass any human gate.
