# Extension Preview Apply UI V1

This branch surfaces preview/apply handoff details in the browser extension popup.

## Purpose

`SAFE_CHANGE_PREVIEW` already emits a `previewHash` and a text diff. This UI layer makes that visible in the delivery queue and provides a copyable apply requirement block.

## Popup additions

New buttons:

```text
Show preview apply requirement
Copy preview apply requirement
```

New section:

```text
Preview apply requirement
```

## Queue additions

Preview queue items now display:

- `preview=true`
- `previewHash=<sha256>`
- `requiredPreviewHash=<sha256>`
- `previewJsonPath=<path>`
- `previewDiffPath=<path>`

## Copyable apply hint

The popup can produce:

```text
ULTIMATEBRIDGE PREVIEW APPLY REQUIREMENT
jobId=<preview job id>
requiredPreviewHash=<sha256>
previewJsonPath=<path>
previewDiffPath=<path>

Use this field in the matching SAFE_CHANGE request:
"requiredPreviewHash": "<sha256>"
```

## Safety note

This does not apply changes automatically. It only makes the preview hash and artifact paths visible and copyable. Applying changes still requires a separate `SAFE_CHANGE` request.

## Local checks

```text
npm test
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
5. Confirm the queue displays `previewHash`, `requiredPreviewHash`, and preview artifact paths.
6. Click `Show preview apply requirement`.
7. Click `Copy preview apply requirement`.
