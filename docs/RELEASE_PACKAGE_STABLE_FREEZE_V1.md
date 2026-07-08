# Release Package / Stable Freeze V1

This milestone adds a reproducible release-package and stable-freeze plan for UltimateBridge.

## New command

```powershell
npm run release:freeze:plan
```

Optional release name:

```powershell
npm run release:freeze:plan -- --release-name UltimateBridge_MVP_V1_STABLE_FREEZE
```

The command writes:

```text
artifacts/release-freeze/stable-freeze-plan.json
artifacts/release-freeze/stable-freeze-plan.md
artifacts/release-freeze/stable-freeze-manifest.json
```

## Purpose

The freeze planner prepares the final release-package structure without publishing anything.

It records:

```text
release name
proposed zip name
include patterns
exclude patterns
important file list
important file SHA256 values
required preflight commands
manual freeze steps
acceptance criteria
```

## Required preflight

Before creating a real freeze zip, run:

```powershell
npm run verify:local
npm run status:local
npm run dogfood:real-project:plan
npm run release:freeze:plan
```

## Include patterns

```text
package.json
README.md
START_ULTIMATEBRIDGE.cmd
docs
extension
native-host
scripts
tests
```

## Exclude patterns

```text
.git
node_modules
artifacts
*.log
*.tmp
```

## Important manifest files

The plan checks and records key files such as:

```text
package.json
START_ULTIMATEBRIDGE.cmd
docs/FINAL_STATUS_MVP_V1.md
docs/START_HERE_MVP_V1.md
docs/MILESTONES_MVP_V1.md
docs/INSTALLER_LAUNCHER_V1.md
docs/NATIVE_HOST_EXTENSION_ID_HELPER_V1.md
docs/BROWSER_NATIVE_CONNECTION_DIAGNOSTICS_V1.md
docs/NATIVE_HOST_REAL_INSTALL_REHEARSAL_V1.md
docs/EXTENSION_LOAD_RELOAD_GUIDE_V1.md
docs/LOCAL_STATUS_DASHBOARD_V1.md
docs/REAL_PROJECT_DOGFOOD_RUN_V1.md
scripts/verify-local.mjs
scripts/build-local-status-dashboard.mjs
scripts/build-real-project-dogfood-run.mjs
```

## Manual freeze steps

```text
Run npm run verify:local.
Run npm run status:local.
Run npm run release:freeze:plan.
Review artifacts/release-freeze/stable-freeze-plan.md.
Create a zip from the repository working tree using the include and exclude lists.
Store the zip outside the repository artifacts folder.
Record the zip SHA256 next to the generated manifest.
```

## Safety

The planner only writes local release-freeze planning artifacts.

It does not:

```text
create a Git tag
create a GitHub release
publish an npm package
upload files
push commits
modify source files outside its own generated artifacts
```

## Smoke

```powershell
npm run smoke:release-package-stable-freeze
```

The smoke verifies:

```text
freeze planner exists
protocol marker exists
plan-only mode exists
plan, markdown, and manifest artifact paths exist
important MVP docs are listed
include and exclude patterns are present
SHA256 helper is present
manual freeze steps are present
preflight commands are present
package scripts exist
verify:local includes this smoke
```

## Full verification

```powershell
npm run verify:local
```

The full verification stack now includes:

```text
npm run smoke:release-package-stable-freeze
```
