# Browser Project Workflow Panel V1

This branch adds a guided workflow panel to the extension popup.

## Purpose

The popup had many individual tools. This adds a clear operator path:

```text
1. Project
2. Analyze
3. Preview
4. Apply
5. Proof
```

## New panel

```text
Project workflow
1. Project: show remembered root
2. Analyze: copy READ_ONLY template
3. Preview: copy SAFE_CHANGE_PREVIEW template
4. Apply: build SAFE_CHANGE apply block
5. Proof: copy session summary
```

## Behavior

The workflow panel delegates to existing safe controls:

```text
show-project-root-memory
show-project-root-labels
copy-selected-command-template
build-safe-change
copy-session-summary
```

It uses the existing command template dropdown for:

```text
read-only-healthcheck
safe-change-preview-skeleton
```

## Safety boundary

The workflow panel does not add a new execution path. It is a guided wrapper around existing review-first controls.

It does not:

```text
submit chat messages automatically
run latest bridge blocks automatically
apply changes automatically
upload artifacts automatically
run rollback automatically
bypass project-root allowlist checks
hide the full approvedProjectRoot
```

## New smoke

```text
npm run smoke:browser-project-workflow-panel
```

The smoke proves:

- workflow panel exists
- all five workflow steps exist
- workflow controller script is loaded
- workflow actions delegate to existing safe controls
- Analyze uses READ_ONLY template
- Preview uses SAFE_CHANGE_PREVIEW template
- Apply uses existing SAFE_CHANGE builder
- Proof uses session summary
- no automatic submit path is introduced

## Verification

`npm run verify:local` now includes:

```text
npm run smoke:browser-project-workflow-panel
```

## Manual browser check

1. Reload the unpacked UltimateBridge extension.
2. Open the popup.
3. Use the five buttons from top to bottom.
4. Confirm each step updates `Project workflow` status.
5. Confirm Analyze/Preview copy text only.
6. Confirm Apply prepares the SAFE_CHANGE apply block but does not submit it.
7. Confirm Proof copies the session summary.
