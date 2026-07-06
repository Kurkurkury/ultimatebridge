# Browser SAFE_CHANGE Builder V1

This branch adds a browser-side builder for a copyable `SAFE_CHANGE` apply block based on the latest `SAFE_CHANGE_PREVIEW` queue item.

## Purpose

After a preview succeeds, the popup can prepare the matching apply request with the correct `requiredPreviewHash`.

This improves the browser workflow:

```text
SAFE_CHANGE_PREVIEW -> review diff/hash -> build SAFE_CHANGE apply block -> user copies/runs separately
```

## Popup additions

New buttons:

```text
Build SAFE_CHANGE apply block
Copy SAFE_CHANGE apply block
```

New section:

```text
SAFE_CHANGE apply block
```

## Queue additions

Preview queue items now preserve:

- `approvedProjectRoot`
- original structured preview `changes`
- `previewHash`
- `previewJsonPath`
- `previewDiffPath`

## Generated block

The generated block is JSON:

```json
{
  "protocol": "ULTIMATEBRIDGE_REQUEST_V1",
  "requestId": "APPLY_FROM_PREVIEW",
  "mode": "SAFE_CHANGE",
  "taskName": "ApplyFromPreview",
  "approvedProjectRoot": "...",
  "requiredPreviewHash": "<previewHash>",
  "changes": []
}
```

## Safety note

The extension does not execute the apply block automatically. It only displays and copies it. Actual file changes still require a separate explicit `SAFE_CHANGE` request.

## Local checks

```text
npm test
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
2. Run a `SAFE_CHANGE_PREVIEW` bridge block.
3. Open the popup.
4. Click `Refresh delivery queue`.
5. Click `Build SAFE_CHANGE apply block`.
6. Confirm the block includes `mode=SAFE_CHANGE`, `approvedProjectRoot`, `requiredPreviewHash`, and the original changes.
7. Click `Copy SAFE_CHANGE apply block`.
