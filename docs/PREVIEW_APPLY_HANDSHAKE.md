# Preview Apply Handshake V1

This branch adds a lightweight hash handshake between `SAFE_CHANGE_PREVIEW` and `SAFE_CHANGE`.

## Purpose

Preview mode already shows what would change without writing files. This handshake lets the apply step prove that it is applying the same approved change shape.

## Preview output

`SAFE_CHANGE_PREVIEW` now emits a stable SHA-256 `previewHash` based on:

- normalized `approvedProjectRoot`
- structured `changes`

The preview artifact includes:

```json
{
  "previewHash": "<sha256>",
  "applyRequirement": {
    "field": "requiredPreviewHash",
    "value": "<sha256>"
  }
}
```

The text diff also prints:

```text
previewHash=<sha256>
requiredPreviewHash=<sha256>
```

## Apply request

`SAFE_CHANGE` can include:

```json
{
  "requiredPreviewHash": "<sha256 from preview>"
}
```

If the current apply request computes the same hash, `SAFE_CHANGE` proceeds. If the hash does not match, the request is blocked before writing files with:

```text
PREVIEW_HASH_MISMATCH
```

## Compatibility

The hash check is optional. Existing `SAFE_CHANGE` requests without `requiredPreviewHash` continue to work, while higher-safety flows can require the preview hash.

## Local checks

```text
npm test
npm run smoke:preview-apply
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

This does not make apply automatic. It only lets a user-confirmed apply request bind itself to the previewed change set.
