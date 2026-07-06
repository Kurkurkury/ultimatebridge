# Safety Model

UltimateBridge is a local execution bridge, not a fully autonomous agent.

## Permission modes

- `READ_ONLY`: inspect files, read status, list metadata, run non-mutating checks.
- `SAFE_CHANGE`: write inside an explicitly selected project path with backups.
- `PROJECT_CHANGE`: larger project edits with task-specific approval.
- `EXECUTION_LOCKED`: no execution; parse and report only.

Default mode is `READ_ONLY`.

## Hard rules

1. Never execute when the target host identity does not match.
2. Never assume admin rights.
3. Never collect or print secrets.
4. Never delete, send, archive, or publish without explicit approval.
5. Never silently escalate from read-only to write mode.
6. Never trust unvalidated browser text as a local command.
7. Always write a report even on failure.

## Sensitive data handling

The following must be redacted in reports: API keys, OAuth tokens, session cookies, passwords, private keys, local env values, and browser profile data.

## Local path rule

Write operations must stay inside the approved project root unless the request explicitly grants a broader scope.

## Human gate

The user remains the approver. UltimateBridge can recommend actions and prepare files, but destructive or external actions need explicit instruction in the request.
