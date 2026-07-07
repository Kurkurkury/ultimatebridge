# Installer / Launcher V1

This milestone adds operator-friendly start, install-plan, and repair-plan scripts for the UltimateBridge MVP.

## New commands

```powershell
.\START_ULTIMATEBRIDGE.cmd
npm run launcher:plan
npm run install:native-host:plan
npm run repair:plan
```

## Launcher

```powershell
npm run launcher:plan
```

The launcher checks:

```text
Node available
npm available
PowerShell available
package.json exists
extension manifest exists
native host script exists
popup exists
```

It does not install, apply, send, upload, rollback, or modify GitHub.

## Native host install plan

```powershell
npm run install:native-host:plan
```

This writes a plan artifact:

```text
artifacts/install/native-host-install-plan.json
```

Default mode is plan-only. It does not write native messaging registry keys or install files unless the PowerShell script is explicitly run with `-Apply` after manual review.

The manifest intentionally includes:

```text
__REPLACE_WITH_EXTENSION_ID__
```

The operator must replace that placeholder with the real unpacked extension id before relying on browser native messaging.

## Repair plan

```powershell
npm run repair:plan
```

This writes:

```text
artifacts/repair/repair-plan.json
```

Default mode is plan-only. It recommends diagnostics, verification, extension reload, and native-host install-plan review.

Apply mode is intentionally narrow. It may run `npm install` only when `package-lock.json` exists and `node_modules` is missing.

## Safety boundary

These scripts do not change the UltimateBridge trust model.

They do not:

```text
submit browser messages
apply SAFE_CHANGE blocks
upload artifacts
run rollback automatically
git push
git merge
bypass project-root allowlists
hide approvedProjectRoot
```

## Smoke

```powershell
npm run smoke:installer-launcher
```

The smoke checks that:

```text
launcher files exist
launcher reports plan protocol
native host installer is plan-only by default
repair script is plan-only by default
registry writes are gated by Apply
extension id placeholder is visible
package scripts exist
verify:local includes installer launcher smoke
```

## Full verification

```powershell
npm run verify:local
```

The full verification stack now includes:

```text
npm run smoke:installer-launcher
```
