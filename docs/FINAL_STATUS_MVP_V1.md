# UltimateBridge Final Status MVP V1

## Status

```text
PRODUCT_READY_MVP_V1=YES
FINAL_MVP_STATUS=STABLE_LOCAL_HUMAN_GATED_BRIDGE
MILESTONE_COUNT=29
```

UltimateBridge is a clean-room successor foundation for AutoBridge 5. It provides a controlled, human-gated bridge between Browser ChatGPT and a local Windows host.

The current MVP is ready for local operator use with strict safety boundaries.

## Primary purpose

UltimateBridge lets ChatGPT and the local Windows machine cooperate through explicit, reviewable tasks:

```text
Analyze local project context
Prepare controlled changes
Preview changes without writing
Apply approved changes with preview-hash handshake
Emit reports and artifacts
Keep rollback plans
Guide the browser operator through manual review gates
```

## Current product boundary

UltimateBridge is not autonomous. It does not own the final decision to run, send, apply, upload, delete, rollback, publish, or merge.

The intended operating model is:

```text
ChatGPT proposes
UltimateBridge prepares/checks/reports
Noah reviews
Noah manually sends or approves
UltimateBridge proves result
```

## Safety model

The MVP preserves these boundaries:

```text
READ_ONLY is separate from SAFE_CHANGE_PREVIEW and SAFE_CHANGE
SAFE_CHANGE requires approvedProjectRoot
project-root allowlist enforcement stays in the native host
preview writes no target files
apply requires matching preview hash
apply blocks mismatched or missing preview hash
rollback plan artifacts are created after apply
browser insertion is manual-send only
popup controls are copy/insert/review first
artifact upload is user-confirmed only
GitHub merge/publish remains external and explicit
```

## Main local commands

```powershell
npm run diagnose:local
npm run verify:local
```

Use `diagnose:local` for fast local setup/troubleshooting.

Use `verify:local` for full PR/freeze proof.

## Proof artifacts

```text
artifacts/local-diagnostics/latest.json
artifacts/local-diagnostics/latest.md
artifacts/local-verification/latest.json
artifacts/local-verification/latest.md
```

## Popup workflow

The browser popup now exposes a guided workflow:

```text
1. Project
2. Analyze
3. Preview
4. Apply
5. Proof
```

This gives the operator a normal path instead of only a loose tool list.

## Current MVP recommendation

This MVP is ready to use as the stable baseline for the next development phase.

Next development should focus on polish and installation convenience, not on changing the core safety model.
