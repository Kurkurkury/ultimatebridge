# Browser Diff Viewer V1

This branch adds a compact diff preview section to the extension popup.

## Purpose

The previous workflow exposed the preview JSON and diff artifact paths. This branch adds an immediate browser-side summary so the user can see what the latest `SAFE_CHANGE_PREVIEW` would change before building, inserting, or manually sending an apply block.

## Popup addition

New section:

```text
Diff preview
```

The section shows:

```text
ULTIMATEBRIDGE DIFF PREVIEW
previewJobId=<job>
previewHash=<hash>
requiredPreviewHash=<hash>
approvedProjectRoot=<root>
previewJsonPath=<path>
previewDiffPath=<path>
changeCount=<n>

change[0] op=<op>
path=<relative path>
search=<compact search text>
replace=<compact replacement text>
content=<compact content text>
risk=<risk label>
```

## New helper

```text
extension/src/diff-viewer.js
```

Exports:

```text
buildDiffViewerState(queue)
formatDiffViewerState(state)
```

The helper uses the latest preview queue item and its preserved structured `previewChanges`.

## Risk labels

The diff viewer is informational. It adds lightweight visibility labels:

```text
normal
check-required
large-write
blocked-by-path-policy-if-executed
```

The native host path policy and allowlist remain the enforcement layer.

## New smoke

```text
npm run smoke:browser-diff-viewer
```

The smoke proves:

- preview leaves the target file unchanged
- preview queue contains hash and diff artifact paths
- diff viewer shows header, preview hash, diff path, change count, operation, path, search and replace text
- popup HTML contains `diff-preview`
- popup JS imports and updates the diff viewer on queue load
- queue clear resets the diff preview

## Local checks

```text
npm test
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
3. Refresh the delivery queue.
4. Confirm `Diff preview` shows the preview hash, diff path, operation, relative path, and search/replace summary.
5. Build or insert the apply block only after reviewing the diff summary.
