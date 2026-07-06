# SAFE_CHANGE Backup and Scope Model

This branch enables the first limited write mode for UltimateBridge.

## Rules

`SAFE_CHANGE` is not a general shell execution mode. It only accepts structured file operations.

Required fields:

- `mode`: `SAFE_CHANGE`
- `approvedProjectRoot`: absolute local project root approved by the user
- `changes`: non-empty array

Supported operations:

- `writeTextFile`
- `replaceText`

Blocked:

- absolute target paths
- paths escaping `approvedProjectRoot`
- missing approved project root
- missing changes
- unsupported operations
- `PROJECT_CHANGE` remains blocked

## Example request

```json
{
  "protocol": "ULTIMATEBRIDGE_REQUEST_V1",
  "requestId": "SAFE_EXAMPLE",
  "mode": "SAFE_CHANGE",
  "approvedProjectRoot": "C:\\Path\\To\\Project",
  "changes": [
    {
      "op": "writeTextFile",
      "path": "notes/result.txt",
      "content": "hello"
    }
  ]
}
```

## Backup behavior

When a target file already exists, the previous file content is copied into the run folder under `backups` before writing the new content.

## Local checks

```text
npm test
npm run smoke:safe-change
npm run smoke:readonly
npm run e2e:native
pwsh -NoProfile -File scripts/check-powershell.ps1
```
