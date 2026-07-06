# Bridge 5 Feature Parity

This document tracks what must be retained from AutoBridge 5.

| Area | Bridge 5 behavior | UltimateBridge target |
|---|---|---|
| Stable legacy block | No language label, no codeblock attributes, `AUTO_BRIDGE_REQUEST_ID=AUTO` | Supported by legacy parser |
| First action gate | First real PowerShell action starts task | Enforced by validator |
| Native host | Browser-to-local command transport | Rebuilt as job-spool native host |
| Timeout-safe runner | Process timeout and non-hanging reports | Central process runner |
| Runner report | Structured runner report with status and marker hash | `ULTIMATEBRIDGE_RUNNER_REPORT_V1` |
| Upload staging | Stage files for ChatGPT upload | Attachment manifest and router |
| Empty upload skip | Do not upload empty artifacts | Required manifest validation |
| Copybug guard | Defend against ChatGPT/Edge render-copy bug | Send verifier with hash re-read |
| Host gate | SPEIDELBASE/target host validation | Host policy in request validator |
| Safe modes | Read-only vs change modes | Explicit permission modes |
| Large report fallback | Avoid broken direct sends | Report router chooses attachment |

## Explicit non-goals

- Do not copy the whole old Bridge 5 directory as-is.
- Do not preserve accidental hotfix layering.
- Do not keep project-specific code in extension or native host.
- Do not hide failed sends as success.
