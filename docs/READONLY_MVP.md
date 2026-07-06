# Read-only MVP Flow

This branch adds the first executable UltimateBridge path.

## Flow

```text
ChatGPT legacy block
  -> protocol validator
  -> job spool creates run folder
  -> PowerShell healthcheck runs through process runner
  -> stdout/stderr/runner-result are captured
  -> structured report is written
  -> attachment manifest is written
  -> report router chooses delivery mode
```

## Local smoke test

```powershell
npm test
npm run smoke:readonly
pwsh -NoProfile -File scripts/check-powershell.ps1
```

## Native host registration

After loading the extension unpacked and copying its extension id:

```powershell
pwsh -NoProfile -File scripts/install-native-host.ps1 -Browser Edge -ExtensionId <EXTENSION_ID>
```

Uninstall:

```powershell
pwsh -NoProfile -File scripts/uninstall-native-host.ps1 -Browser Edge
```

## Current limitation

Only `READ_ONLY` and `EXECUTION_LOCKED` are intentionally handled. `SAFE_CHANGE` and `PROJECT_CHANGE` are blocked until backup and project-scope enforcement are implemented.
