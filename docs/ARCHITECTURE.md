# UltimateBridge Architecture

UltimateBridge is split into small layers. Each layer has one job and passes structured data to the next layer.

```text
ChatGPT page
  -> extension content detector
  -> extension service worker
  -> native messaging client
  -> native host protocol validator
  -> job spool
  -> PowerShell runner
  -> report router
  -> attachment router
  -> ChatGPT response or staged upload
```

## Layers

### Browser content layer

Detect bridge blocks, extract raw text, show status, and insert report text only through a send verifier. It must not run local commands and must not contain project-specific logic.

### Extension service worker

Own browser-side state, forward validated text to the native host, receive status/report metadata, and coordinate upload or text insertion.

### Native host

Validate and normalize requests, enforce host identity and safety rules, create one immutable job folder per run, start runner processes with timeout/cleanup, and emit structured status events.

### Runner

Execute allowed PowerShell task steps, capture stdout/stderr, write structured reports, and stage attachments with SHA-256 and size metadata.

### Report and attachment routers

Decide direct text vs attachment delivery, prevent empty uploads, and preserve full artifacts when ChatGPT text limits are reached.

## Contract-first design

All cross-layer payloads are versioned:

- `ULTIMATEBRIDGE_REQUEST_V1`
- `ULTIMATEBRIDGE_RUNNER_REPORT_V1`
- `ULTIMATEBRIDGE_ATTACHMENT_MANIFEST_V1`

Legacy AutoBridge 5 text blocks are treated as input format only. Internally they are normalized into `ULTIMATEBRIDGE_REQUEST_V1`.

## Failure strategy

UltimateBridge must fail closed:

- Unknown host: blocked.
- Unknown mode: blocked.
- Missing task begin marker: blocked.
- Oversized direct report: routed to attachment.
- Corrupted ChatGPT send text: blocked.
- Runner timeout: process tree terminated, timeout report emitted.
