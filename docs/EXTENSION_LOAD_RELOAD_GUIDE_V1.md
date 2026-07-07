# Extension Load / Reload Guide V1

This milestone adds a clear operator guide and local checklist artifact for loading and reloading the UltimateBridge browser extension.

## New command

```powershell
npm run extension:load:checklist
```

Optional extension id validation:

```powershell
npm run extension:load:checklist -- -ExtensionId <32-letter-extension-id>
```

The checklist writes:

```text
artifacts/browser/extension-load-reload-checklist.json
artifacts/browser/extension-load-reload-checklist.md
```

## Chrome

Open:

```text
chrome://extensions
```

Then:

```text
Enable Developer mode
Click Load unpacked
Select the repository extension folder
Copy the generated Extension-ID
Open the UltimateBridge popup
Click Show browser/native diagnostics
```

## Edge

Open:

```text
edge://extensions
```

Then use the same steps:

```text
Enable Developer mode
Click Load unpacked
Select the repository extension folder
Copy the generated Extension-ID
Open the UltimateBridge popup
Click Show browser/native diagnostics
```

## Extension-ID follow-up

After copying the real browser Extension-ID, run:

```powershell
npm run native-host:extension-id:plan -- -ExtensionId <id>
npm run native-host:install:rehearsal -- -ExtensionId <id>
```

Review the generated artifacts before any later explicit install action.

## Reload workflow

After changing extension code or manifest files:

```text
Return to chrome://extensions or edge://extensions
Click Reload on the unpacked UltimateBridge extension
Open the popup again
Click Show browser/native diagnostics
Confirm the Extension-ID did not change unless the folder changed
```

## Diagnostics controls

The popup contains:

```text
Show browser/native diagnostics
Copy browser/native diagnostics
```

Diagnostics are report-only. The real native smoke remains a separate manual action:

```text
Run native read-only smoke
```

## Safety

The checklist is guide-only.

It does not:

```text
load the browser extension automatically
change browser profile settings
install or modify the native host
write registry keys
send browser messages
send native messages
run SAFE_CHANGE
```

## Smoke

```powershell
npm run smoke:extension-load-reload-guide
```

The smoke checks:

```text
checklist script exists
protocol marker exists
guide-only mode is explicit
JSON and Markdown artifact names are present
extension id validation is present
Chrome and Edge extension URLs are documented
Load unpacked and Reload steps are documented
diagnostics controls are wired
package scripts exist
verify:local includes this smoke
```

## Full verification

```powershell
npm run verify:local
```

The full verification stack now includes:

```text
npm run smoke:extension-load-reload-guide
```
