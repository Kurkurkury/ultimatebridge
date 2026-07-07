# Browser Project Root Labels V1

This branch adds short labels for remembered project roots in the extension popup.

## Purpose

Project root memory can store long Windows paths. This feature adds a readable label layer so the user can quickly recognize roots such as:

```text
P024 UltimateBridge
P002 TradingBot
P008 AutoBridge 5 Core
UltimateBridge
TradingBot
AutoBridge
```

## Popup additions

New buttons:

```text
Show project root labels
Copy project root label map
```

New section:

```text
Project root labels
```

## Output format

```text
ULTIMATEBRIDGE PROJECT ROOT LABELS
available=true
itemCount=2
selectedLabel=P024 UltimateBridge
selectedRoot=<full path>
nextAction=Use the label to confirm the intended project root before copying preview templates.

root[0] label=P024 UltimateBridge
selected=true
source=inferred
path=<full path>
```

## Label inference

The helper infers labels from folder names:

```text
Projekt_024_UltimateBridge -> P024 UltimateBridge
Projekt_002_TradingBot -> P002 TradingBot
Projekt_008_AutoBridge_5_Core -> P008 AutoBridge 5 Core
ultimatebridge-* -> UltimateBridge
```

Custom labels are also supported through a map keyed by full root path.

## Storage key

```text
ultimatebridgeProjectRootLabels
```

This stores optional custom labels. The feature does not alter the native host allowlist.

## New helper

```text
extension/src/project-root-labels.js
```

Exports:

```text
buildProjectRootLabels(memory, customLabels)
formatProjectRootLabels(labels)
buildProjectRootLabelMap(labels)
inferProjectRootLabel(root)
```

## New smoke

```text
npm run smoke:browser-project-root-labels
```

The smoke proves:

- empty labels report `available=false`
- inferred labels work for `Projekt_024_UltimateBridge`
- custom labels override inferred labels
- selected root gets selected label
- copyable root-to-label map is produced
- popup contains label section and buttons
- popup imports label helper
- popup updates labels from project root memory

## Local checks

```text
npm test
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
2. Ensure project root memory has at least one remembered root.
3. Click `Show project root labels`.
4. Confirm the selected root has a readable label.
5. Click `Copy project root label map`.
6. Confirm the copied JSON maps full roots to short labels.
7. Use the label only as a readability aid; the full path and native-host allowlist remain authoritative.
