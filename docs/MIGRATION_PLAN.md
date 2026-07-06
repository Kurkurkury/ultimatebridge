# Migration Plan From AutoBridge 5

## Phase 0: Foundation

Create repository structure, protocol contracts, docs, CI, and skeleton modules.

## Phase 1: Read-only path

Implement one fully working read-only command path:

1. ChatGPT block detection.
2. Native host request validation.
3. Job folder creation.
4. PowerShell health/read-only execution.
5. Structured report.
6. Direct report send or staged report.

## Phase 2: Attachment pipeline

Move Bridge 5 upload behavior into a manifest-driven router.

## Phase 3: Legacy compatibility

Support stable Bridge 5 command style while normalizing internally.

## Phase 4: Safe changes

Add backup-backed write mode with project scope enforcement.

## Phase 5: Hardening

Add timeout tree-kill, send verifier, report fallback, test matrix, and migration check script.

## Migration principle

Bridge 5 is the reference. UltimateBridge is the cleaned implementation.
