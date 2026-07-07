# Native Host Real Install Rehearsal V1

This milestone adds a read-only rehearsal for the real native host installation state.

## Purpose

The normal install flow is intentionally plan-first. Before using any explicit Apply mode, the operator needs a safe way to inspect the expected and current local state.

The rehearsal checks whether the current machine already matches the expected native host installation shape.

## New command

```powershell
npm run native-host:install:rehearsal
```

Optional extension id check:

```powershell
npm run native-host:install:rehearsal -- -ExtensionId <32-letter-extension-id>
```

The extension id must match:

```text
^[a-p]{32}$
```

## Output artifact

```text
artifacts/install/native-host-install-rehearsal.json
```

## What it checks

```text
repository root exists
native host source exists
install root exists
launcher file exists
native host manifest exists
manifest host name matches
manifest launcher path matches
manifest allowed origin matches
Chrome registry value matches
Edge registry value matches
```

## Expected native host name

```text
com.ultimatebridge.host
```

This matches the browser transport, the install plan, and the extension id helper.

## Report status

The rehearsal can return:

```text
PASS
REVIEW_NEEDED
```

`REVIEW_NEEDED` is not a failed install attempt. It means the machine state does not yet match the expected install shape and should be reviewed before any explicit Apply.

## Safety

This rehearsal is read-only.

It does not:

```text
write registry keys
write native host manifests
run SAFE_CHANGE
send browser messages
send native messages
upload artifacts
run rollback
git push
git merge
```

It only writes its own report artifact.

## Related commands

```powershell
npm run install:native-host:plan
npm run native-host:extension-id:plan -- -ExtensionId <id>
npm run native-host:install:rehearsal -- -ExtensionId <id>
```

## Smoke

```powershell
npm run smoke:native-host-install-rehearsal
```

The smoke verifies:

```text
rehearsal script exists
protocol marker exists
mode is read-only rehearsal
host name is aligned
extension id is validated
manifest and registry are read, not written
package script exists
verify:local includes this smoke
```

## Full verification

```powershell
npm run verify:local
```

The full local verification stack includes the native host install rehearsal smoke.
