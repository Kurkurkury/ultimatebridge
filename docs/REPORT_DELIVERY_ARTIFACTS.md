# Report Delivery Artifacts

This branch adds explicit delivery planning for every UltimateBridge job.

## New artifacts

Each completed job now writes:

- `ultimatebridge-runner-report.json`
- `attachment-manifest.json`
- `delivery-plan.json`
- `chatgpt-response.txt`

Depending on the job type, the manifest can also include:

- `runner-result.json`
- `stdout.txt`
- `stderr.txt`
- `safe-change-result.json`
- other staged artifacts

## Delivery modes

`direct`: report is small enough to send directly as text.

`staged_artifacts`: report is too large for safe direct delivery; ChatGPT should receive a short response and the staged files should be uploaded or surfaced.

## Local checks

```text
npm test
npm run smoke:delivery
npm run smoke:readonly
npm run smoke:safe-change
npm run e2e:native
pwsh -NoProfile -File scripts/check-powershell.ps1
```

## Current limitation

This branch writes the delivery plan and response artifact. It does not yet perform fully automated browser file upload. The next layer should connect `delivery-plan.json` to the extension upload queue.
