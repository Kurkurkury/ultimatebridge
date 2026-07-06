# Manual Send Guard V1

This branch makes the browser-side apply workflow more explicit about manual review.

## Purpose

UltimateBridge can now build and insert a `SAFE_CHANGE` apply block into the active ChatGPT input field. This guard makes the manual send requirement visible and machine-checkable.

## Generated apply block markers

`buildSafeChangeApplyBlock()` now includes:

```json
{
  "manualReviewRequired": true,
  "sendBehavior": "USER_MUST_REVIEW_AND_SEND_MANUALLY",
  "sourcePreviewJobId": "<preview job id>"
}
```

These fields are also accepted by the request schema and preserved by the native host request normalizer.

## Popup UI

The popup includes a permanent section:

```text
Manual send guard
```

The popup status text for build/copy/insert actions says the generated block is for manual review only and was not submitted.

## Static guard checks

The smoke test checks that:

- the popup has a manual guard section
- generated apply blocks include manual review markers
- the content adapter exposes hash-checked insertion
- neither the popup nor content adapter calls submit APIs
- insertion remains a user-reviewed text preparation step

## Safety note

This feature does not prevent a user from manually sending a generated block. That is intentional. It prevents the extension from silently crossing the line from prepare/insert into send/execute.

## Local checks

```text
npm test
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
4. Confirm the `Manual send guard` section is visible.
5. Build or insert the `SAFE_CHANGE` apply block.
6. Confirm it contains `manualReviewRequired=true` and `sendBehavior=USER_MUST_REVIEW_AND_SEND_MANUALLY`.
7. Confirm the message is inserted only and not submitted automatically.
