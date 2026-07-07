# Browser Template Selection UI V1

This branch adds an explicit command template selector to the extension popup.

## Purpose

Previously the popup could copy only the recommended command template. The popup can now copy a user-selected template while keeping the existing recommended-copy workflow.

## New popup controls

```text
Template select
Copy selected command template
```

Template IDs:

```text
read-only-healthcheck
safe-change-preview-skeleton
apply-from-latest-preview
rollback-restore-review
artifact-checklist
session-summary
final-review-checklist
```

## Behavior

The selected template copy action uses the same root-aware command template library as the recommended copy action.

That means selected templates can include:

```text
rootLabel
rootPath
projectLabel
full approvedProjectRoot
```

when project root memory/labels are available.

## Safety boundary

This remains copy-only.

The selection UI does not:

```text
submit messages automatically
apply changes automatically
upload artifacts automatically
run rollback automatically
hide the full approvedProjectRoot
bypass native-host allowlist enforcement
```

## New smoke

```text
npm run smoke:browser-template-selection-ui
```

The smoke proves:

- popup contains the template select
- popup contains the copy-selected button
- all seven template options exist
- popup JS reads the selected value
- popup JS uses the root-aware template getter
- selected preview template keeps the remembered root and project label
- selected apply template stays `SAFE_CHANGE`
- selected apply template keeps `USER_MUST_REVIEW_AND_SEND_MANUALLY`
- selected copy path is copy-only

## Verification

`npm run verify:local` now includes:

```text
npm run smoke:browser-template-selection-ui
```

## Manual browser check

1. Reload the unpacked UltimateBridge extension.
2. Open the popup.
3. Pick a template in the `Template` dropdown.
4. Click `Copy selected command template`.
5. Paste into a text editor.
6. Confirm the selected template was copied.
7. Confirm full root path remains visible where applicable.
8. Confirm the popup does not submit anything automatically.
