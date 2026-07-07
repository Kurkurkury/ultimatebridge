# Browser Session Summary V1

This branch adds a compact popup session summary for the current UltimateBridge workflow.

## Purpose

The popup already shows detailed panels for roundtrip status, diff preview, artifact plans, and final review readiness. This feature adds a short operational summary that answers:

```text
What happened last?
Which preview/apply cycle is current?
Which project root is involved?
What is the next action?
What should I send to ChatGPT next?
```

## Popup additions

New buttons:

```text
Show session summary
Copy session summary
```

New section:

```text
Session summary
```

## Summary output

```text
ULTIMATEBRIDGE SESSION SUMMARY
available=true
queueCount=<n>
latestJobId=<job>
latestJobStatus=<status>
latestJobSummary=<summary>
latestProjectRoot=<root>
previewJobId=<job>
applyJobId=<job>
previewHash=<hash>
applyHash=<hash>
applyStatus=<status>
applyBlockBuilt=<true|false>
applyBlockHash=<hash>
insertOk=<true|false>
insertHash=<hash>
submitted=<true|false>
readyToApply=<true|false>
readyToComplete=<true|false>
nextAction=<recommended next action>
chatgptNextMessage=<what to send ChatGPT next>

recentJobs:
- [0] <job> status=<status> preview=<true|false> artifacts=<n> summary=<summary>
```

## New helper

```text
extension/src/session-summary.js
```

Exports:

```text
buildBrowserSessionSummary(queue, insertion, applyBlockState)
formatBrowserSessionSummary(summary)
```

The helper reuses the final review checklist, so `readyToApply`, `readyToComplete`, and `nextAction` are consistent with the final checklist panel.

## New smoke

```text
npm run smoke:browser-session-summary
```

The smoke proves:

- empty queue produces a useful empty-state next message
- preview leaves the target file unchanged
- before apply, summary shows `readyToApply=true` and `readyToComplete=false`
- before apply, summary tells the user to manually send the inserted block
- after apply, summary shows `readyToComplete=true`
- after apply, summary tells the user to review artifacts and mark complete
- popup has session summary section and show/copy buttons
- popup updates the summary on queue load
- popup clears the summary on queue clear

## Local checks

```text
npm test
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

## Manual browser check

1. Reload the unpacked UltimateBridge extension.
2. Run a `SAFE_CHANGE_PREVIEW` block.
3. Build and insert a matching `SAFE_CHANGE` apply block.
4. Open `Session summary`.
5. Confirm `readyToApply=true`, `readyToComplete=false`, and the ChatGPT next message tells you to manually send the inserted block.
6. Manually send the apply block.
7. Refresh the delivery queue.
8. Confirm `readyToComplete=true` and the ChatGPT next message says to review artifacts and mark complete.
