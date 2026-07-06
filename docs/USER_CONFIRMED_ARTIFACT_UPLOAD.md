# User-confirmed Artifact Upload Plan

This branch adds an explicit confirmation step before any delivery artifacts are prepared for sharing.

## Purpose

UltimateBridge should not silently upload or share local files. The popup now lets the user prepare a manual plan from the latest delivery queue entry.

## New popup actions

- `Prepare latest artifact upload`
- `Copy upload plan`
- `Clear upload plan`

## New runtime messages

- `ULTIMATEBRIDGE_PREPARE_LATEST_ARTIFACT_UPLOAD`
- `ULTIMATEBRIDGE_GET_ARTIFACT_UPLOAD_PLAN`
- `ULTIMATEBRIDGE_CLEAR_ARTIFACT_UPLOAD_PLAN`

## Plan protocol

Prepared plans use:

```text
ULTIMATEBRIDGE_USER_CONFIRMED_ARTIFACT_UPLOAD_PLAN_V1
```

The plan contains:

- job id
- status
- delivery mode
- confirmation timestamp
- `chatgpt-response.txt` path
- full report path
- artifact path, kind, size, and SHA-256

## Safety rule

This does not perform automatic upload. It only creates a user-confirmed manual plan and a copyable instruction block.

## Local checks

```text
npm test
npm run smoke:confirmed-plan
npm run smoke:extension-queue
npm run smoke:delivery
npm run smoke:readonly
npm run smoke:safe-change
npm run e2e:native
pwsh -NoProfile -File scripts/check-powershell.ps1
```

## Manual browser check

1. Reload the unpacked UltimateBridge extension.
2. Run native read-only smoke.
3. Confirm the delivery queue contains a job.
4. Click `Prepare latest artifact upload`.
5. Confirm the user-confirmed plan appears.
6. Click `Copy upload plan`.
7. Click `Clear upload plan`.
