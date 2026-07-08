# Real Project Dogfood Run V1

This milestone adds a reproducible dogfood run plan for testing UltimateBridge against a real local project.

## New command

```powershell
npm run dogfood:real-project:plan
```

Optional project metadata:

```powershell
npm run dogfood:real-project:plan -- --project-root "C:\Path\To\Project" --project-label "my-project"
```

The command writes:

```text
artifacts/dogfood/real-project-dogfood-run.json
artifacts/dogfood/real-project-dogfood-run.md
```

## Purpose

The dogfood run is not a fake unit test. It is a structured operator plan for validating the full real workflow:

```text
READ_ONLY analysis
SAFE_CHANGE_PREVIEW
apply block prepared for manual review
proof upload
local verification
local status dashboard
```

## Phases

### 1. READ_ONLY analysis

Use the browser workflow to request a scoped project analysis.

Expected proof:

```text
read-only report in the delivery queue
summary of analyzed project structure
one tiny documentation-only improvement candidate
```

### 2. Preview

Request a preview for a small reversible documentation-only change.

Expected proof:

```text
preview report
diff summary
preview hash
changed files list
```

### 3. Apply block prepared

Use the browser popup to build the apply block for manual review only.

Expected proof:

```text
apply block exists
manual review gate visible
no automatic submit
```

### 4. Proof

Run:

```powershell
npm run verify:local
npm run status:local
```

Expected proof:

```text
artifacts/local-verification/latest.md
artifacts/local-status/latest.md
```

## Smoke

```powershell
npm run smoke:real-project-dogfood-run
```

The smoke verifies:

```text
dogfood planner exists
protocol marker exists
plan/proof-template mode exists
JSON and Markdown artifact paths are present
READ_ONLY, preview, apply-block-prepared, and proof phases exist
manual review boundary is documented
suggested prompts are generated
acceptance criteria are present
package scripts exist
verify:local includes this smoke
```

## Full verification

```powershell
npm run verify:local
```

The full verification stack now includes:

```text
npm run smoke:real-project-dogfood-run
```
