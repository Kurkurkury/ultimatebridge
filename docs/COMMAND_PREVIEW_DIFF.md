# Command Preview Diff V1

This branch adds a dry preview layer before `SAFE_CHANGE`.

## New mode

```text
SAFE_CHANGE_PREVIEW
```

The preview mode uses the same safety gates as `SAFE_CHANGE`:

- `approvedProjectRoot` is required.
- the root must be locally allowlisted.
- target paths must stay inside the approved root.
- only supported structured operations are accepted.

Unlike `SAFE_CHANGE`, preview mode does not write target files.

## New artifacts

A successful preview emits:

- `safe-change-preview.json`
- `safe-change-preview.diff.txt`

These artifacts are included in the normal attachment manifest and delivery plan.

## Supported preview operations

- `writeTextFile`
- `replaceText`

## Local checks

```text
npm test
npm run smoke:preview-diff
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

`SAFE_CHANGE_PREVIEW` is intentionally non-mutating. It lets the local host show exactly what would change before a separate `SAFE_CHANGE` request applies the change.
