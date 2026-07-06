# Project Root Allowlist

This branch adds a second safety gate for `SAFE_CHANGE`.

Before this change, `SAFE_CHANGE` required an `approvedProjectRoot` and blocked path traversal outside that root. Now the approved root must also be present in a local project roots config file.

## Local config

Copy the example file:

```text
config/project-allowlist.local.json.example
```

Create the local file:

```text
config/project-allowlist.local.json
```

Example:

```json
{
  "protocol": "ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1",
  "allowedProjectRoots": [
    "C:\\Users\\noahr\\Desktop\\ChatGPT_Projekte\\01_Aktive_Projekte\\Projekt_024_UltimateBridge"
  ]
}
```

The local config is ignored by git via `config/*.local.json`.

## SAFE_CHANGE behavior

`SAFE_CHANGE` now requires:

1. `approvedProjectRoot`
2. a matching entry in `config/project-allowlist.local.json`
3. target paths that stay inside the approved root
4. supported structured operations only

Blocked cases:

- missing project roots config
- approved root not listed
- absolute target paths
- `../` path escape
- unsupported write operations

## Local checks

```text
npm test
npm run smoke:project-roots
npm run smoke:safe-change
npm run smoke:readonly
npm run smoke:delivery
npm run smoke:extension-queue
npm run smoke:confirmed-plan
npm run e2e:native
pwsh -NoProfile -File scripts/check-powershell.ps1
```

## Safety note

This is intentionally stricter than trusting the request payload. ChatGPT can propose an `approvedProjectRoot`, but the local machine decides whether that root is actually allowed.
