# Full Browser Preview Apply Roundtrip V1

This branch adds an automated proof for the complete browser-side preview/apply workflow.

## Purpose

The previous milestones built the pieces:

1. `SAFE_CHANGE_PREVIEW`
2. preview hash and diff artifacts
3. extension delivery queue
4. apply block builder
5. hash-checked insert-only path
6. manual send guard

This branch proves those pieces work together as one roundtrip.

## Roundtrip flow

```text
SAFE_CHANGE_PREVIEW
-> queue captures previewHash + preview JSON/diff paths
-> browser builds SAFE_CHANGE apply block with requiredPreviewHash
-> block is inserted only, not submitted
-> manual send is simulated by passing the generated block to the native host
-> SAFE_CHANGE applies with previewHashMatched=true
-> roundtrip proof reports allOk=true
```

## New proof helper

```text
extension/src/roundtrip-proof.js
```

Exports:

```text
ROUNDTRIP_PROOF_PROTOCOL
buildBrowserRoundtripProof(input)
formatBrowserRoundtripProof(proof)
```

Proof protocol:

```text
ULTIMATEBRIDGE_BROWSER_PREVIEW_APPLY_ROUNDTRIP_PROOF_V1
```

## New smoke

```text
npm run smoke:full-browser-roundtrip
```

The smoke verifies:

- preview leaves the target file unchanged
- queue captures preview hash and preview artifacts
- generated apply block contains `manualReviewRequired=true`
- generated apply block contains `sendBehavior=USER_MUST_REVIEW_AND_SEND_MANUALLY`
- insertion is marked `submitted=false`
- apply runs through the native host
- apply report contains `previewHashRequired=true`
- apply report contains `previewHashMatched=true`
- target file changes only after apply
- final proof has `allOk=true`

## Local checks

```text
npm test
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
2. Run a `SAFE_CHANGE_PREVIEW` bridge block.
3. Open the popup.
4. Confirm preview hash and diff artifact paths are visible in the queue.
5. Build the `SAFE_CHANGE` apply block.
6. Insert it into the ChatGPT input.
7. Confirm it is not submitted automatically.
8. Send it manually.
9. Confirm the resulting delivery queue/report shows `previewHashMatched=true`.
