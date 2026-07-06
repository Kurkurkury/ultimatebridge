# Extension Delivery Queue

This branch adds a lightweight delivery queue to the UltimateBridge extension.

## Purpose

After a native host response, the extension now extracts the delivery information and stores a compact queue entry in `chrome.storage.local`.

The popup can show:

- status
- ok flag
- job id
- delivery mode
- summary
- `chatgpt-response.txt` path
- full report path
- uploadable artifacts

## Runtime messages

The service worker now supports:

- `ULTIMATEBRIDGE_RUN_READONLY_SMOKE`
- `ULTIMATEBRIDGE_REQUEST_DETECTED`
- `ULTIMATEBRIDGE_GET_DELIVERY_QUEUE`
- `ULTIMATEBRIDGE_CLEAR_DELIVERY_QUEUE`

## Popup actions

- Run native read-only smoke
- Run latest ChatGPT bridge block
- Refresh delivery queue
- Clear queue

## Local checks

```text
npm test
npm run smoke:extension-queue
npm run smoke:delivery
npm run smoke:readonly
npm run smoke:safe-change
npm run e2e:native
pwsh -NoProfile -File scripts/check-powershell.ps1
```

## Current limitation

The queue displays and tracks ready artifacts. It does not yet automatically upload files into ChatGPT. The next layer should connect queued artifact paths to a user-confirmed upload action.
