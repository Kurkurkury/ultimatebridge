# V1.0 Closure / Handover Docs V1

This milestone adds the final V1.0 closure and handover documentation generator for UltimateBridge.

## New command

```powershell
npm run closure:v1:docs
```

The command writes:

```text
artifacts/v1-closure/v1-closure-summary.json
artifacts/v1-closure/FINAL_STATUS_V1_0.md
artifacts/v1-closure/START_HERE_V1_0.md
artifacts/v1-closure/NEXT_CHAT_HANDOVER_V1_0.md
artifacts/v1-closure/V1_0_FREEZE_INSTRUCTIONS.md
```

## Purpose

The closure generator creates a final, compact V1.0 handover set from the latest local proof artifacts.

It summarizes:

```text
product name
version
final acceptance decision
productReady flag
latest verification status
stable milestone count
release freeze name
proposed ZIP name
next-chat handover
freeze instructions
operator safety boundaries
```

## Evidence read by the generator

```text
artifacts/local-verification/latest.json
artifacts/local-status/latest.json
artifacts/final-acceptance/final-v1-acceptance-sweep.json
artifacts/release-freeze/stable-freeze-plan.json
artifacts/release-freeze/stable-freeze-manifest.json
```

## Generated files

### FINAL_STATUS_V1_0.md

Final status summary with:

```text
V1 decision
productReady flag
verification result
final acceptance result
stable milestone count
release package name
safety notes
```

### START_HERE_V1_0.md

Entry point for the next local operator or ChatGPT session.

Includes:

```text
current state
first local commands
important generated files
operational boundary
```

### NEXT_CHAT_HANDOVER_V1_0.md

Compact next-chat handover.

Includes:

```text
project
version
decision
latest proof summary
continue-from-here checklist
key commands
```

### V1_0_FREEZE_INSTRUCTIONS.md

Manual freeze instructions.

Includes:

```text
release name
proposed ZIP name
preflight commands
manual ZIP creation note
explicit non-publication boundary
```

## Required preflight before a final manual freeze

```powershell
npm run verify:local
npm run status:local
npm run acceptance:v1:sweep
npm run release:freeze:plan
npm run closure:v1:docs
```

## Smoke

```powershell
npm run smoke:v1-closure-handover-docs
```

The smoke verifies:

```text
closure builder exists
protocol marker exists
docs-only mode exists
summary JSON path exists
final V1.0 output filenames exist
proof evidence paths are read
productReady logic exists
40 stable milestones marker exists
key commands are listed
package scripts exist
verify:local includes this smoke
```

## Full verification

```powershell
npm run verify:local
```

The full verification stack now includes:

```text
npm run smoke:v1-closure-handover-docs
```

## Safety

The closure generator only writes local closure documentation artifacts.

It does not:

```text
publish a release
create a Git tag
upload files
modify browser settings
modify native host setup
apply project changes
send browser messages
```
