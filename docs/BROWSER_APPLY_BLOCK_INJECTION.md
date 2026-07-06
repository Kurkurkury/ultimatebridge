# Browser Apply Block Injection V1

This branch adds optional browser-side insertion for a generated `SAFE_CHANGE` apply block.

## Purpose

After `SAFE_CHANGE_PREVIEW`, the popup can already build a matching `SAFE_CHANGE` JSON request with `requiredPreviewHash`. This branch adds a convenience action that inserts that block into the active ChatGPT input field.

## Popup addition

New button:

```text
Insert SAFE_CHANGE apply block into chat input
```

## Behavior

The popup flow is:

```text
latest SAFE_CHANGE_PREVIEW queue item
-> build SAFE_CHANGE apply block
-> call window.UltimateBridgeSafeInsertText(block) in the active tab
-> verify inserted text hash
-> show result in popup
```

## Safety

This feature does not submit the message.

It only inserts text into the active chat input. The user must still review and send manually.

The content adapter exposes:

```text
window.UltimateBridgeSafeInsertText
```

It performs a SHA-256 hash check after insertion and returns `INPUT_HASH_MISMATCH` if the input content does not match the intended block.

## Local checks

```text
npm test
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
2. Run a `SAFE_CHANGE_PREVIEW` bridge block.
3. Open the popup.
4. Click `Refresh delivery queue`.
5. Click `Build SAFE_CHANGE apply block`.
6. Click `Insert SAFE_CHANGE apply block into chat input`.
7. Confirm the apply block appears in the ChatGPT input field.
8. Confirm it was not submitted automatically.
