import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApplyBlockStateFromRequest,
  buildFinalReviewChecklist,
  formatFinalReviewChecklist
} from '../extension/src/final-review-checklist.js';

const previewHash = 'e'.repeat(64);
const previewItem = {
  isPreview: true,
  jobId: 'PREVIEW_JOB',
  status: 'OK',
  summary: 'SAFE_CHANGE_PREVIEW changes=1',
  previewHash,
  requiredPreviewHash: previewHash,
  previewJsonPath: 'C:/run/safe-change-preview.json',
  previewDiffPath: 'C:/run/safe-change-preview.diff.txt',
  previewChanges: [{ op: 'replaceText', path: 'file.txt', search: 'before', replace: 'after' }],
  artifacts: [
    { path: 'C:/run/ultimatebridge-runner-report.json', kind: 'json', size: 100, sha256: 'reporthash', upload: true },
    { path: 'C:/run/safe-change-preview.json', kind: 'json', size: 200, sha256: 'previewhash', upload: true },
    { path: 'C:/run/safe-change-preview.diff.txt', kind: 'text', size: 80, sha256: 'diffhash', upload: true }
  ]
};

const applyItem = {
  isPreview: false,
  jobId: 'APPLY_JOB',
  status: 'OK',
  summary: 'SAFE_CHANGE applied changes=1',
  previewHash,
  requiredPreviewHash: previewHash,
  artifacts: [
    { path: 'C:/run/ultimatebridge-runner-report.json', kind: 'json', size: 110, sha256: 'applyreporthash', upload: true },
    { path: 'C:/run/safe-change-result.json', kind: 'json', size: 220, sha256: 'resulthash', upload: true },
    { path: 'C:/run/rollback-plan.json', kind: 'json', size: 330, sha256: 'rollbackhash', upload: true },
    { path: 'C:/run/rollback-restore-command.txt', kind: 'text', size: 90, sha256: 'cmdhash', upload: true }
  ]
};

const applyRequest = {
  protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
  requestId: 'APPLY',
  mode: 'SAFE_CHANGE',
  taskName: 'ApplyTask',
  requiredPreviewHash: previewHash,
  manualReviewRequired: true,
  sendBehavior: 'USER_MUST_REVIEW_AND_SEND_MANUALLY',
  sourcePreviewJobId: 'PREVIEW_JOB',
  changes: [{ op: 'replaceText', path: 'file.txt', search: 'before', replace: 'after' }]
};

test('buildApplyBlockStateFromRequest captures manual apply metadata', () => {
  const state = buildApplyBlockStateFromRequest(applyRequest, 'blockhash');
  assert.equal(state.built, true);
  assert.equal(state.requiredPreviewHash, previewHash);
  assert.equal(state.manualReviewRequired, true);
  assert.equal(state.sendBehavior, 'USER_MUST_REVIEW_AND_SEND_MANUALLY');
  assert.equal(state.sourcePreviewJobId, 'PREVIEW_JOB');
  assert.equal(state.changeCount, 1);
  assert.equal(state.blockHash, 'blockhash');
});

test('buildFinalReviewChecklist reports readyToApply before apply completes', () => {
  const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'blockhash');
  const checklist = buildFinalReviewChecklist([previewItem], { ok: true, submitted: false, hash: 'inserthash' }, applyBlockState);
  assert.equal(checklist.readyToApply, true);
  assert.equal(checklist.readyToComplete, false);
  assert.match(checklist.nextAction, /Manually send/);
  assert.equal(checklist.checks.find((item) => item.id === 'applyOk').ok, false);
});

test('buildFinalReviewChecklist reports readyToComplete after apply and rollback artifacts', () => {
  const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'blockhash');
  const checklist = buildFinalReviewChecklist([applyItem, previewItem], { ok: true, submitted: false, hash: 'inserthash' }, applyBlockState);
  assert.equal(checklist.readyToApply, true);
  assert.equal(checklist.readyToComplete, true);
  assert.equal(checklist.checks.every((item) => item.ok), true);
  assert.match(checklist.nextAction, /mark the change complete/);
});

test('buildFinalReviewChecklist blocks readiness when insertion was auto-submitted', () => {
  const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'blockhash');
  const checklist = buildFinalReviewChecklist([previewItem], { ok: true, submitted: true, hash: 'inserthash' }, applyBlockState);
  assert.equal(checklist.readyToApply, false);
  assert.equal(checklist.checks.find((item) => item.id === 'notAutoSubmitted').ok, false);
});

test('formatFinalReviewChecklist renders readable checkbox output', () => {
  const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'blockhash');
  const checklist = buildFinalReviewChecklist([applyItem, previewItem], { ok: true, submitted: false, hash: 'inserthash' }, applyBlockState);
  const text = formatFinalReviewChecklist(checklist);
  assert.match(text, /ULTIMATEBRIDGE FINAL REVIEW CHECKLIST/);
  assert.match(text, /readyToApply=true/);
  assert.match(text, /readyToComplete=true/);
  assert.match(text, /\[x\] previewAvailable/);
  assert.match(text, /\[x\] rollbackPlanAvailable/);
});
