# Browser Artifact Open/Upload Plan V1

This branch adds a popup view that explains which run artifacts exist, why they matter, and what the user should review next.

## Purpose

The delivery queue already stores uploadable artifacts. This feature turns those paths into a compact review plan for the latest preview/apply workflow.

## Popup additions

New buttons:

```text
Show artifact open/upload plan
Copy artifact open/upload plan
```

New section:

```text
Artifact open/upload plan
```

## Plan output

```text
ULTIMATEBRIDGE ARTIFACT OPEN/UPLOAD PLAN
available=true
previewJobId=<job>
applyJobId=<job>
previewHash=<hash>
applyHash=<hash>
nextReview=<recommended next review>
artifactCount=<n>

artifact[0] phase=<preview|apply>
role=<role>
purpose=<why this exists>
recommendedAction=<what to do with it>
upload=<true|false>
kind=<json|text|unknown>
size=<bytes>
sha256=<hash>
path=<local path>
```

## Artifact roles

The helper recognizes:

```text
runnerReport
previewJson
previewDiff
applyResult
rollbackPlan
rollbackRestoreCommand
deliveryPlan
chatResponse
artifact
```

## New helper

```text
extension/src/artifact-open-plan.js
```

Exports:

```text
buildArtifactOpenPlan(queue)
formatArtifactOpenPlan(plan)
```

## New smoke

```text
npm run smoke:browser-artifact-open-plan
```

The smoke proves:

- preview creates preview JSON and diff artifacts
- apply creates apply result and rollback artifacts
- plan includes preview and apply job IDs
- plan includes preview hash and apply hash
- plan labels artifact roles correctly
- plan shows recommended next review
- popup contains artifact open plan section
- popup has show/copy buttons
- popup refreshes the plan when the queue loads
- popup clears the plan when the queue is cleared

## Local checks

```text
npm test
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

## Manual browser check

1. Reload the unpacked UltimateBridge extension.
2. Run a `SAFE_CHANGE_PREVIEW` block.
3. Build and manually send a matching `SAFE_CHANGE` apply block.
4. Refresh the delivery queue.
5. Click `Show artifact open/upload plan`.
6. Confirm the plan lists preview diff, preview JSON, apply result, rollback plan, rollback restore command, and runner reports.
7. Copy the plan when you need to paste the artifact checklist into ChatGPT.
