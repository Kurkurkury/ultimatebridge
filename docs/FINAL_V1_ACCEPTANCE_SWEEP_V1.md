# Final V1 Acceptance Sweep V1

This milestone adds the final V1 acceptance sweep for UltimateBridge.

## New command

```powershell
npm run acceptance:v1:sweep
```

The command writes:

```text
artifacts/final-acceptance/final-v1-acceptance-sweep.json
artifacts/final-acceptance/final-v1-acceptance-sweep.md
```

## Purpose

The acceptance sweep reads the latest local proof artifacts and creates a clear V1 decision.

Possible decisions:

```text
V1_READY
REVIEW_NEEDED
```

## Evidence read by the sweep

```text
artifacts/local-verification/latest.json
artifacts/local-status/latest.json
artifacts/release-freeze/stable-freeze-plan.json
artifacts/release-freeze/stable-freeze-manifest.json
artifacts/dogfood/real-project-dogfood-run.json
artifacts/browser/extension-load-reload-checklist.json
artifacts/install/native-host-install-rehearsal.json
```

## Source files checked

```text
package.json
START_ULTIMATEBRIDGE.cmd
docs/FINAL_STATUS_MVP_V1.md
docs/START_HERE_MVP_V1.md
docs/MILESTONES_MVP_V1.md
docs/RELEASE_PACKAGE_STABLE_FREEZE_V1.md
docs/REAL_PROJECT_DOGFOOD_RUN_V1.md
docs/LOCAL_STATUS_DASHBOARD_V1.md
docs/EXTENSION_LOAD_RELOAD_GUIDE_V1.md
scripts/verify-local.mjs
```

## Acceptance matrix

The sweep checks:

```text
Core verification
Local status
Release readiness
Dogfood readiness
Browser setup readiness
Native setup readiness
Documentation set
Launcher set
Verification script
```

## Required commands before closure

```powershell
npm run verify:local
npm run status:local
npm run dogfood:real-project:plan
npm run release:freeze:plan
npm run acceptance:v1:sweep
```

## Smoke

```powershell
npm run smoke:final-v1-acceptance-sweep
```

The smoke verifies:

```text
acceptance sweep builder exists
protocol marker exists
report-only mode exists
JSON and Markdown output paths exist
V1_READY and REVIEW_NEEDED decisions are present
key evidence paths are read
acceptance matrix is present
closure commands are present
package scripts exist
verify:local includes this smoke
```

## Full verification

```powershell
npm run verify:local
```

The full verification stack now includes:

```text
npm run smoke:final-v1-acceptance-sweep
```

## Safety

The sweep only writes acceptance-report artifacts.

It does not:

```text
publish a release
create a Git tag
upload files
modify browser settings
modify native host setup
apply project changes
```
