# UltimateBridge

UltimateBridge is a clean-room successor foundation for AutoBridge 5. Its goal is to connect ChatGPT, a browser extension, a native messaging host, and a local Windows runner through a strict, testable, human-gated protocol.

This repository is intentionally built as a new baseline instead of a direct copy of the existing Bridge 5 folder. Bridge 5 remains the feature reference; UltimateBridge turns those features into modular contracts, tests, and smaller implementation layers.

## Core goals

- Stable ChatGPT-to-local-host execution with explicit human gating.
- Strict separation between browser detection, native-host transport, job execution, reports, and attachments.
- Legacy compatibility for the stable AutoBridge 5 block style, including `AUTO_BRIDGE_REQUEST_ID=AUTO`.
- Safer defaults: read-only first, host identity checks, no secrets in logs, no admin actions without explicit approval.
- Reliable report delivery with fallback to attachments for large output.
- A first-class attachment pipeline with manifests, SHA-256 checks, and empty-file skipping.
- A copy/render guard that verifies inserted ChatGPT text before sending.

## Current status

Foundation scaffold. The repository contains architecture documents, protocol schemas, initial native-host skeleton code, extension skeleton code, PowerShell runner skeletons, and CI/test scaffolding.

## Repository layout

```text
.github/workflows/      GitHub Actions CI
common/                 Shared JavaScript helpers
connector/              ChatGPT/GitHub-connector oriented project notes
config/                 Example local configuration files
contrib/                Migration and contribution notes
docs/                   Architecture, safety, migration, feature parity
extension/              Browser extension skeleton
native-host/            Native messaging host skeleton
protocol/               Request/report/attachment schemas and docs
runner/powershell/      Windows runner scripts
scripts/                Setup and validation scripts
tests/                  Protocol and module tests
```

## Safety rule

UltimateBridge is not an autonomous agent. It is a controlled bridge. The bridge may read, stage, summarize, test, and report. Destructive writes, sending messages, deleting files, or running privileged actions must require explicit approval in the request protocol.

## First local checks

```powershell
npm test
pwsh -NoProfile -File scripts/check-powershell.ps1
```

## Definition of done for the first usable MVP

- Extension loads in Chromium/Edge.
- Native host starts and passes health check.
- Legacy AutoBridge 5 request blocks are parsed and normalized.
- A read-only local command can be executed with timeout and process cleanup.
- A structured runner report is created.
- Large reports are delivered as staged attachments.
- Attachment manifest contains size and SHA-256 metadata.
- Copy/render guard blocks corrupted send text.
- CI checks protocol, JavaScript tests, and PowerShell parsing.
