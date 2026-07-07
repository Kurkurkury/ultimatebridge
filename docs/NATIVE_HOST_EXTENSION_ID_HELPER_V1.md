# Native Host Extension ID Helper V1

This milestone adds a helper for preparing the native-host manifest with the real Chrome or Edge extension id.

## Problem

The native-host install plan intentionally keeps this placeholder visible:

```text
__REPLACE_WITH_EXTENSION_ID__
```

That is safe, but the operator still needs a reliable way to prepare the final allowed origin after the unpacked extension id is known.

## New command

```powershell
npm run native-host:extension-id:plan -- -ExtensionId <32-letter-extension-id>
```

Example format:

```powershell
npm run native-host:extension-id:plan -- -ExtensionId aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

The id must match:

```text
^[a-p]{32}$
```

## Output artifact

```text
artifacts/install/native-host-extension-id-plan.json
```

The plan contains:

```text
protocol
mode
extensionId
allowedOrigin
manifestPath
manifest
safety notes
```

## Default behavior

Default mode is plan-only. It writes the plan artifact but does not modify the installed native-host manifest.

## Apply behavior

Apply mode is explicit:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Set-NativeHostExtensionId.ps1 -ExtensionId <id> -Apply
```

Apply mode only updates the native-host manifest file when the install directory already exists.

It does not:

```text
write registry keys
submit browser messages
run SAFE_CHANGE
upload artifacts
run rollback
git push
git merge
```

## Required manual browser step

1. Load the unpacked UltimateBridge extension.
2. Copy the real extension id from Chrome or Edge extensions page.
3. Run the plan command with that id.
4. Review `artifacts/install/native-host-extension-id-plan.json`.
5. Only then use explicit Apply if needed.

## Smoke

```powershell
npm run smoke:native-host-extension-id-helper
```

The smoke proves:

```text
helper exists
extension id is mandatory
extension id format is validated
allowed origin is built as chrome-extension://<id>/
default mode is plan-only
Apply updates only the manifest file
registry writes are not performed
package script exists
verify:local includes this smoke
```

## Full verification

```powershell
npm run verify:local
```

The full local verification stack includes the extension-id helper smoke.
