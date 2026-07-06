# Known Bridge 5 Problems To Solve

## Native message channel fragility

Long local work can outlive browser message ports. UltimateBridge accepts a job quickly, runs locally through a spool, and delivers status/report through explicit phases.

## Copy/render corruption

ChatGPT/Edge can render or copy text incorrectly. UltimateBridge verifies the exact text hash after insertion and before send.

## Oversized direct reports

Large logs are unreliable as direct chat text. UltimateBridge direct-sends only small summaries and stages full reports as attachments.

## Upload edge cases

Empty files, unsupported image types, and mixed report artifacts can confuse upload logic. UltimateBridge uses manifest-first upload routing with size, kind, extension allowlist, and SHA-256.

## Patch accumulation

Repeated fixes can make the bridge hard to reason about. UltimateBridge uses module boundaries, protocol schemas, tests, and CI from the start.

## Ambiguous command authority

Local commands can become too implicit. UltimateBridge defaults to `READ_ONLY`, uses explicit write modes, and validates host/project scope.
