# Browser Root-Aware Command Templates V1

This branch adds a root-aware wrapper around the existing command template library.

## Purpose

The base command template library is intentionally generic. Project root memory and project root labels now provide enough context to create more useful templates such as:

```text
SAFE_CHANGE_PREVIEW skeleton for P024 UltimateBridge
Apply latest preview for P024 UltimateBridge
```

The full `approvedProjectRoot` remains inside the copied JSON and remains authoritative.

## New helper

```text
extension/src/root-aware-command-templates.js
```

Exports:

```text
buildRootAwareCommandTemplateLibrary(queue, insertion, applyBlockState, options)
formatRootAwareCommandTemplateLibrary(library)
getRootAwareCommandTemplateById(library, templateId)
```

## What it adds

The wrapper keeps the base template library behavior and adds:

```text
rootAware
selectedRoot
selectedLabel
labels
template.rootLabel
template.rootPath
projectLabel in preview/apply JSON
```

## Supported context

The helper can infer labels from queue roots or accept explicit context:

```text
storedRoots
customLabels
memory
labels
```

## Safety boundary

This is still copy-only template generation.

The wrapper does not:

```text
submit messages automatically
apply changes automatically
bypass allowlist checks
change the full approvedProjectRoot
upload artifacts automatically
run rollback automatically
```

## New smoke

```text
npm run smoke:browser-root-aware-command-templates
```

The smoke proves:

- stored root memory creates root-aware templates even without queue items
- inferred label `P024 UltimateBridge` is used
- preview skeleton includes both `projectLabel` and full `approvedProjectRoot`
- latest apply template includes `projectLabel`
- latest apply template remains `SAFE_CHANGE`
- latest apply template remains `USER_MUST_REVIEW_AND_SEND_MANUALLY`
- preview remains non-mutating
- apply changes the test file only after explicit apply request

## Local checks

```text
npm test
npm run smoke:browser-root-aware-command-templates
npm run smoke:browser-project-root-labels
npm run smoke:browser-project-root-memory
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

## Notes

The existing popup command template panel remains compatible with the base library. This wrapper is a safe intermediate layer for root-aware template generation and can be wired into the popup in a later UI step if desired.
