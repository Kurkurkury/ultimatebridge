# Browser Roundtrip UI Panel V1

This branch makes the browser-side Preview→Apply roundtrip visible in the extension popup.

## Purpose

The previous milestone added a machine-readable full roundtrip proof. This branch adds a popup panel that summarizes the most important roundtrip fields for the user.

## Popup addition

New section:

```text
Roundtrip status
```

The section shows:

```text
allOk=<true|false>
previewJobId=<job>
previewHash=<hash>
requiredPreviewHash=<hash>
previewJsonPath=<path>
previewDiffPath=<path>
applyJobId=<job>
applyHash=<hash>
applyStatus=<status>
insertOk=<true|false>
insertHash=<hash>
submitted=<true|false>
previewHashMatched=<true|false>
```

## Behavior

The popup now:

1. Reads the delivery queue.
2. Finds the latest preview queue item.
3. Finds the latest apply queue item with matching hash fields.
4. Reads the last persisted insert-only status.
5. Renders a compact roundtrip status block.

The insert-only status is stored under:

```text
ultimatebridgeLastApplyInsertion
```

Clearing the delivery queue also clears the stored insert status.

## New helpers

In `extension/src/roundtrip-proof.js`:

```text
buildRoundtripPanelState(queue, insertion)
formatRoundtripPanelState(state)
```

## New smoke

```text
npm run smoke:browser-roundtrip-panel
```

The smoke proves:

- preview leaves the target file unchanged
- apply changes the target file
- preview and apply queue items can build a popup panel state
- insert status is represented as `insertOk=true` and `submitted=false`
- panel shows `applyStatus=OK`
- panel shows `previewHashMatched=true`
- panel shows `allOk=true`
- popup HTML contains `roundtrip-status`
- popup JS imports and uses the roundtrip panel formatter

## Local checks

```text
npm test
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
4. Build and insert the `SAFE_CHANGE` apply block.
5. Confirm `Roundtrip status` shows `insertOk=true` and `submitted=false`.
6. Manually send the inserted apply block.
7. Refresh the delivery queue.
8. Confirm `applyStatus=OK`, `previewHashMatched=true`, and `allOk=true`.
