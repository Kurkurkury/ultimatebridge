# Browser Final Review Checklist V1

This branch adds a final popup checklist for the Preview→Apply workflow.

## Purpose

UltimateBridge now has preview, diff viewing, apply block generation, insert-only guard, roundtrip status, and artifact review planning. This branch combines those signals into a final checklist that answers two questions:

```text
readyToApply=<true|false>
readyToComplete=<true|false>
```

## Popup additions

New buttons:

```text
Show final review checklist
Copy final review checklist
```

New section:

```text
Final review checklist
```

## Checklist output

```text
ULTIMATEBRIDGE FINAL REVIEW CHECKLIST
readyToApply=<true|false>
readyToComplete=<true|false>
previewJobId=<job>
applyJobId=<job>
previewHash=<hash>
applyHash=<hash>
applyBlockHash=<hash>
insertHash=<hash>
nextAction=<recommended next step>

[x] previewAvailable - SAFE_CHANGE_PREVIEW exists in delivery queue.
[x] previewHashAvailable - Preview hash exists.
[x] previewDiffAvailable - Preview diff artifact is available.
[x] previewJsonAvailable - Preview JSON artifact is available.
[x] previewChangesAvailable - Structured preview changes are available.
[x] applyBlockBuilt - SAFE_CHANGE apply block has been built in the popup.
[x] applyBlockMatchesPreviewHash - Apply block requiredPreviewHash matches latest preview hash.
[x] manualReviewRequired - Apply block requires manual review.
[x] manualSendOnly - Apply block is marked manual-send only.
[x] inserted - Apply block was inserted into the browser input.
[x] notAutoSubmitted - Inserted block was not submitted automatically.
[x] applyOk - SAFE_CHANGE apply job completed OK.
[x] applyHashMatchesPreview - Apply preview hash matches latest preview hash.
[x] rollbackPlanAvailable - Rollback plan artifact is available.
[x] rollbackRestoreCommandAvailable - Rollback restore command artifact is available.
[x] artifactsReviewable - Preview/apply artifacts are available for review.
```

## New helper

```text
extension/src/final-review-checklist.js
```

Exports:

```text
buildFinalReviewChecklist(queue, insertion, applyBlockState)
formatFinalReviewChecklist(checklist)
buildApplyBlockStateFromRequest(applyRequest, blockHash)
```

## Stored popup state

The popup already stores the latest insert-only result. This branch also stores the latest built apply block state under:

```text
ultimatebridgeLastApplyBlockState
```

This makes `applyBlockBuilt`, `manualReviewRequired`, `manualSendOnly`, and `applyBlockMatchesPreviewHash` visible in the final checklist.

## New smoke

```text
npm run smoke:browser-final-review-checklist
```

The smoke proves:

- preview leaves the target file unchanged
- apply block is built with manual-review markers
- insert-only proof has `submitted=false`
- checklist reports `readyToApply=true` before apply
- checklist reports `readyToComplete=false` before apply
- apply changes the target file
- after apply, rollback plan and restore command exist
- final checklist reports `readyToComplete=true`
- popup has final review checklist section and show/copy buttons
- popup persists apply block state
- popup refreshes and clears the checklist with queue state

## Local checks

```text
npm test
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

## Manual browser check

1. Reload the unpacked UltimateBridge extension.
2. Run a `SAFE_CHANGE_PREVIEW` block.
3. Build the `SAFE_CHANGE` apply block.
4. Insert it into the ChatGPT input.
5. Confirm the checklist shows `readyToApply=true` and `readyToComplete=false`.
6. Manually send the apply block.
7. Refresh the delivery queue.
8. Confirm the checklist shows `readyToComplete=true`.
