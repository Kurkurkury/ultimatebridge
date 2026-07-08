# Local Status Dashboard V1

This milestone adds a compact local status report for UltimateBridge.

## New command

```powershell
npm run status:local
```

The command writes:

```text
artifacts/local-status/latest.json
artifacts/local-status/latest.md
```

## What it reads

```text
artifacts/local-verification/latest.json
artifacts/local-diagnostics/latest.json
artifacts/browser/extension-load-reload-checklist.json
artifacts/install/native-host-install-rehearsal.json
artifacts/install/native-host-install-plan.json
artifacts/install/native-host-extension-id-plan.json
artifacts/repair/repair-plan.json
```

## What it shows

```text
overall status
verification status
diagnostics status
found report count
missing report hints
quick actions
source artifact list
```

## Status values

```text
PASS
REVIEW_NEEDED
```

`PASS` requires the latest local verification and local diagnostics reports to be present and green.

Optional setup reports are shown when present, but missing optional reports do not automatically fail the dashboard.

## Quick actions

The dashboard lists the most useful next local commands:

```powershell
npm run diagnose:local
npm run verify:local
npm run extension:load:checklist
npm run native-host:install:rehearsal
npm run status:local
```

## Smoke

```powershell
npm run smoke:local-status-dashboard
```

The smoke verifies:

```text
dashboard builder exists
protocol marker exists
verification artifact path is read
diagnostics artifact path is read
extension checklist path is read
setup rehearsal path is read
JSON and Markdown output paths are present
quick actions are listed
package scripts exist
verify:local includes this smoke
```

## Full verification

```powershell
npm run verify:local
```

The full verification stack now includes:

```text
npm run smoke:local-status-dashboard
```
