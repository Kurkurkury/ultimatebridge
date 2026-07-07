# Browser Project Root Memory V1

This branch adds a small persistent project-root memory to the extension popup.

## Purpose

`SAFE_CHANGE_PREVIEW` requires an explicit `approvedProjectRoot`. This feature remembers recently observed approved roots from queue items and can create a new preview skeleton using the most recent known root.

It reduces manual placeholder editing while keeping the existing safety boundaries:

```text
allowlist still enforced by the native host
preview/apply hash handshake still required
manual review still required
no automatic submit
no automatic apply
```

## Popup additions

New buttons:

```text
Show project root memory
Copy preview template from remembered root
Clear project root memory
```

New section:

```text
Project root memory
```

## Output format

```text
ULTIMATEBRIDGE PROJECT ROOT MEMORY
available=true
rootCount=2
selectedRoot=<latest approved root>
nextAction=Use selectedRoot for the next SAFE_CHANGE_PREVIEW template, then review before sending.
root[0]=<latest approved root>
root[1]=<older approved root>
```

## Storage key

```text
ultimatebridgeProjectRootMemory
```

The memory persists across queue clears. The dedicated `Clear project root memory` button removes it.

## New helper

```text
extension/src/project-root-memory.js
```

Exports:

```text
buildProjectRootMemory(queue, storedRoots, options)
mergeProjectRootMemory(queue, storedRoots, options)
formatProjectRootMemory(memory)
buildPreviewTemplateFromProjectRootMemory(memory, options)
```

## New smoke

```text
npm run smoke:browser-project-root-memory
```

The smoke proves:

- empty memory reports `available=false`
- preview remains non-mutating
- queue roots are remembered
- duplicate roots are deduped
- latest queue root wins over stored roots
- preview skeleton uses remembered selected root
- popup contains project root memory section
- popup has show/copy/clear buttons
- popup stores root memory
- popup updates memory on queue load
- queue clear keeps project root memory

## Local checks

```text
npm test
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

## Manual browser check

1. Reload the unpacked UltimateBridge extension.
2. Run a `SAFE_CHANGE_PREVIEW` block with a valid allowlisted `approvedProjectRoot`.
3. Refresh the queue.
4. Click `Show project root memory`.
5. Confirm the latest root appears as `selectedRoot`.
6. Click `Copy preview template from remembered root`.
7. Confirm the copied JSON contains the remembered root.
8. Review and manually send only when intended.
9. Clear the delivery queue and confirm project root memory remains.
10. Click `Clear project root memory` only when you intentionally want to forget stored roots.
