# Native Extension E2E Workflow

This branch adds the next verification layer after the read-only MVP core.

## Covered

- Native host stdio framing with the 4-byte length prefix used by Chromium native messaging.
- Child-process test against `native-host/src/host.mjs`.
- Legacy read-only request handling.
- Framed response validation with `report.status=OK`.
- Attachment manifest validation.
- Extension status display in the page.
- Popup actions for read-only smoke and latest block execution.

## Local checks

Run:

```text
npm test
npm run smoke:readonly
npm run e2e:native
pwsh -NoProfile -File scripts/check-powershell.ps1
```

## Manual browser check

1. Load the `extension` folder as an unpacked extension.
2. Copy the extension id.
3. Register the native host with `scripts/install-native-host.ps1`.
4. Use the extension popup to run the read-only smoke action.
5. Expected result: `ok=true` and `report.status=OK`.

## Limitation

Write modes stay blocked. Backup, rollback, and project-root enforcement must be built before enabling change modes.
