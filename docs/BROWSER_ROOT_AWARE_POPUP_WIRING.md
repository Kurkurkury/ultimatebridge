# Browser Root-Aware Popup Wiring V1

This branch wires the root-aware command template wrapper directly into the extension popup.

## Purpose

The popup `Command templates` section now uses project root memory and project root labels when it renders and copies command templates.

This means the popup can show and copy templates with:

```text
selectedLabel
selectedRoot
template.rootLabel
template.rootPath
projectLabel in copied preview/apply JSON
```

## Popup behavior

The existing buttons remain:

```text
Show command templates
Copy recommended command template
```

They now use:

```text
buildRootAwareCommandTemplateLibrary
formatRootAwareCommandTemplateLibrary
getRootAwareCommandTemplateById
```

instead of the base command template library directly.

## Data sources

The popup reads:

```text
ultimatebridgeProjectRootMemory
ultimatebridgeProjectRootLabels
```

and passes those into the root-aware command template wrapper.

## Output

The command template area starts with:

```text
ULTIMATEBRIDGE ROOT-AWARE COMMAND TEMPLATE LIBRARY
rootAware=true
selectedLabel=<label>
selectedRoot=<full path>
```

Then it includes the existing command template library output.

## Safety boundary

This changes rendering/copying only.

It does not:

```text
submit messages automatically
apply changes automatically
bypass native host allowlist checks
hide the full approvedProjectRoot
upload artifacts automatically
run rollback automatically
```

## New smoke

```text
npm run smoke:browser-root-aware-popup-wiring
```

The smoke proves:

- popup imports root-aware command template helper
- popup builds command template root context from memory/labels
- popup formats the root-aware command template library
- popup copies the root-aware recommended template
- copied recommended apply template keeps `SAFE_CHANGE`
- copied recommended apply template keeps `USER_MUST_REVIEW_AND_SEND_MANUALLY`
- copied recommended apply template includes `projectLabel`
- existing command template regression smoke still passes

## Local checks

```text
npm test
npm run smoke:browser-root-aware-popup-wiring
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

## Manual browser check

1. Reload the unpacked UltimateBridge extension.
2. Ensure project root memory contains at least one remembered root.
3. Click `Show command templates`.
4. Confirm the output starts with `ULTIMATEBRIDGE ROOT-AWARE COMMAND TEMPLATE LIBRARY`.
5. Confirm `selectedLabel` and `selectedRoot` are visible.
6. Click `Copy recommended command template`.
7. Confirm the copied JSON contains `projectLabel`, full `approvedProjectRoot`, `SAFE_CHANGE` where applicable, and `USER_MUST_REVIEW_AND_SEND_MANUALLY`.
8. Confirm the popup does not submit the message automatically.
