# Start Here - UltimateBridge MVP V1

## Quick start

From the repository root:

```powershell
npm run diagnose:local
npm run verify:local
```

Use `diagnose:local` first when the local setup, Node, npm, PowerShell, extension files, or native-host files may be broken.

Use `verify:local` when a branch, PR, or freeze needs a full proof.

## Normal operator workflow

1. Open ChatGPT in the browser.
2. Open the UltimateBridge extension popup.
3. Use the `Project workflow` panel.
4. Confirm the remembered project root and label.
5. Copy a READ_ONLY or SAFE_CHANGE_PREVIEW template.
6. Review the full command or JSON before sending.
7. Send manually.
8. Refresh the delivery queue.
9. Review diff, preview hash, artifacts, and final checklist.
10. Apply only through the preview-hash guarded SAFE_CHANGE path.
11. Keep rollback artifacts until the milestone is complete.

## Popup workflow buttons

```text
1. Project: show remembered root
2. Analyze: copy READ_ONLY template
3. Preview: copy SAFE_CHANGE_PREVIEW template
4. Apply: build SAFE_CHANGE apply block
5. Proof: copy session summary
```

## Important rules

```text
Do not send apply blocks blindly.
Do not hide approvedProjectRoot.
Do not bypass the project allowlist.
Do not treat preview as apply.
Do not treat insertion as send.
Do not treat diagnostics as proof of a code change.
Do not delete rollback artifacts before completion.
```

## When something fails

Run:

```powershell
npm run diagnose:local
```

Then inspect:

```text
artifacts/local-diagnostics/latest.md
```

If a PR/freeze check fails, run:

```powershell
npm run verify:local
```

Then upload or review:

```text
artifacts/local-verification/latest.md
```

## Current MVP baseline

The MVP baseline includes 29 stable milestones and a full 30-check local verification stack after diagnostics integration.
