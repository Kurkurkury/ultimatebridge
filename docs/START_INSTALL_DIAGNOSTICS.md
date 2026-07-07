# Start / Install / Diagnostics V1

This branch adds a local diagnostics command for UltimateBridge.

## Purpose

`verify:local` proves the full test stack. `diagnose:local` is a faster operator-facing health check for local setup, installation, and daily troubleshooting.

## Command

```powershell
npm run diagnose:local
```

## Output artifacts

```text
artifacts/local-diagnostics/latest.json
artifacts/local-diagnostics/latest.md
```

## What it checks

### Runtime tools

```text
node --version
npm --version
pwsh -NoProfile -Command $PSVersionTable.PSVersion.ToString()
```

### Required files

```text
package.json
scripts/verify-local.mjs
native-host/src/host.mjs
native-host/powershell/UB_BeginTask.ps1
native-host/powershell/UB_EmitReport.ps1
native-host/powershell/UB_HealthCheck.ps1
native-host/powershell/UB_StageAttachments.ps1
extension/src/manifest.json
extension/src/background.js
extension/src/content.js
extension/src/popup/popup.html
extension/src/popup/popup.js
extension/src/popup/project-workflow-panel.js
```

### Required package scripts

```text
test
verify:local
diagnose:local
smoke:local-diagnostics
smoke:browser-project-workflow-panel
smoke:browser-template-selection-ui
smoke:browser-root-aware-popup-wiring
smoke:browser-root-aware-command-templates
smoke:browser-project-root-labels
smoke:browser-project-root-memory
smoke:browser-command-templates
smoke:full-browser-roundtrip
smoke:manual-send-guard
smoke:preview-apply
smoke:rollback
smoke:project-roots
smoke:safe-change
smoke:readonly
smoke:delivery
smoke:extension-queue
smoke:confirmed-plan
e2e:native
check:powershell
```

### Feature checks

```text
popup workflow panel exists
popup workflow script is loaded
command template select exists
manual send guard exists
root-aware template wiring exists
workflow uses READ_ONLY template
workflow uses SAFE_CHANGE_PREVIEW template
workflow uses SAFE_CHANGE builder
workflow does not submit chat automatically
verify:local includes workflow smoke
```

## Smoke

```powershell
npm run smoke:local-diagnostics
```

The smoke runs `npm run diagnose:local`, reads its JSON/Markdown artifacts, and verifies the expected diagnostic proof fields.

## Verification integration

`npm run verify:local` now includes:

```text
npm run smoke:local-diagnostics
```

## Safety

Diagnostics are read/check/report only. They do not apply code changes, modify GitHub, submit browser messages, upload artifacts, run rollback, or bypass project-root allowlists.

## Normal use

For quick local health check:

```powershell
npm run diagnose:local
```

For full PR proof:

```powershell
npm run verify:local
```
