# Browser Command Template Library V1

This branch adds a copy-only command template library to the extension popup.

## Purpose

UltimateBridge now has preview/apply safety gates, diff review, artifact review, final readiness, and session summary. This feature adds ready-made command snippets so the user has less manual typing while the human gate remains intact.

The extension never submits these templates automatically. It only displays or copies them.

## Popup additions

New buttons:

```text
Show command templates
Copy recommended command template
```

New section:

```text
Command templates
```

## Templates

The library currently includes:

```text
read-only-healthcheck
safe-change-preview-skeleton
apply-from-latest-preview
rollback-restore-review
artifact-checklist
session-summary
final-review-checklist
```

## Output format

```text
ULTIMATEBRIDGE COMMAND TEMPLATE LIBRARY
available=true
templateCount=7
nextRecommendedTemplateId=<template id>

template[0] id=read-only-healthcheck
title=READ_ONLY HealthCheck
ready=true
purpose=Ask the native host for a read-only health check.
manualBoundary=copy-only; user must review and send manually
copyTextPreview=AUTO_BRIDGE_REQUEST_ID=AUTO ...
```

## Recommendation logic

```text
No preview yet -> safe-change-preview-skeleton
Preview ready and not applied -> apply-from-latest-preview
Apply complete -> session-summary
Apply artifacts available -> artifact-checklist
Fallback -> final-review-checklist
```

## Safety boundary

All templates are copy-only:

```text
copy-only; user must review and send manually
```

The extension does not:

```text
submit messages automatically
apply changes automatically
run rollback automatically
open files automatically
upload artifacts automatically
```

## New helper

```text
extension/src/command-templates.js
```

Exports:

```text
buildCommandTemplateLibrary(queue, insertion, applyBlockState)
formatCommandTemplateLibrary(library)
getCommandTemplateById(library, templateId)
```

## New smoke

```text
npm run smoke:browser-command-templates
```

The smoke proves:

- empty queue provides base copy-only templates
- preview produces a ready `apply-from-latest-preview` template
- generated apply template includes `SAFE_CHANGE`
- generated apply template includes `USER_MUST_REVIEW_AND_SEND_MANUALLY`
- completed apply recommends `session-summary`
- rollback template becomes ready after apply
- popup contains command templates section
- popup has show/copy buttons
- popup updates templates on queue load
- popup clears templates on queue clear

## Local checks

```text
npm test
npm run smoke:browser-command-templates
npm run smoke:browser-session-summary
npm run smoke:browser-final-review-checklist
npm run smoke:browser-artifact-open-plan
npm run smoke:browser-diff-viewer
npm run smoke:browser-roundtrip-panel
npm run smoke:full-browser-roundtrip
npm run smoke:manual-send-guard
npm run smoke:browser-apply-injection
npm run smoke:browser-safe-change-builder
npm run smoke:extension-preview-ui
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

## Manual browser check

1. Reload the unpacked UltimateBridge extension.
2. Open `Command templates` with an empty delivery queue.
3. Confirm the preview skeleton is recommended.
4. Run a `SAFE_CHANGE_PREVIEW` block.
5. Refresh the queue.
6. Confirm `apply-from-latest-preview` is recommended and includes the preview hash.
7. Copy the recommended command template.
8. Confirm it is inserted/copied only after user action and not submitted automatically.
9. Complete apply manually.
10. Refresh the queue and confirm `session-summary` is recommended.
