# Rollback Restore V1

This branch adds rollback planning for `SAFE_CHANGE`.

## New artifacts

Every successful `SAFE_CHANGE` now emits:

- `safe-change-result.json`
- `rollback-plan.json`
- `rollback-restore-command.txt`

These are included in the attachment manifest and delivery artifacts.

## Rollback operations

The rollback plan supports two operation types:

- `restoreTextFile`: restore an existing file from its backup copy.
- `deleteCreatedFile`: delete a file that was created by the safe change.

## Restore command

The generated `rollback-restore-command.txt` contains:

```text
node scripts/restore-rollback.mjs "<rollback-plan.json>" --dry-run
node scripts/restore-rollback.mjs "<rollback-plan.json>"
```

The restore command writes either:

- `rollback-dry-run-result.json`
- `rollback-restore-result.json`

## Local checks

```text
npm test
npm run smoke:rollback
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

Rollback execution is not automatic. UltimateBridge prepares the rollback plan and restore command. Running the restore remains an explicit local action.
