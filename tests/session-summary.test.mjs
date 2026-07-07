import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrowserSessionSummary, formatBrowserSessionSummary } from '../extension/src/session-summary.js';
import { buildApplyBlockStateFromRequest } from '../extension/src/final-review-checklist.js';

const previewHash = 'f'.repeat(64);
const previewItem = {
  isPreview: true,
  jobId: 'PREVIEW_JOB',
  status: 'OK',
  summary: 'SAFE_CHANGE_PREVIEW changes=1',
  previewHash,
  requiredPreviewHash: previewHash,
  previewJsonPath: 'C:/run/safe-change-preview.json',
  previewDiffPath: 'C:/run/safe-change-preview.diff.txt',
  approvedProjectRoot: 'C:/project',
  previewChanges: [{ op: 'replaceText', path: 'file.txt', search: 'before', replace: 'after' }],
  artifactCount: 3,
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
  artifactCount: 4,
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

const insertion = { ok: true, submitted: false, hash: 'inserthash' };
const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'blockhash');

test('buildBrowserSessionSummary reports empty state', () => {
  const summary = buildBrowserSessionSummary([], null, null);
  assert.equal(summary.available, false);
  assert.equal(summary.readyToApply, false);
  assert.equal(summary.readyToComplete, false);
  assert.match(summary.chatgptNextMessage, /Run SAFE_CHANGE_PREVIEW/);
});

test('buildBrowserSessionSummary reports ready-to-apply session before apply', () => {
  const summary = buildBrowserSessionSummary([previewItem], insertion, applyBlockState);
  assert.equal(summary.available, true);
  assert.equal(summary.latestJobId, 'PREVIEW_JOB');
  assert.equal(summary.latestProjectRoot, 'C:/project');
  assert.equal(summary.previewJobId, 'PREVIEW_JOB');
  assert.equal(summary.applyJobId, null);
  assert.equal(summary.readyToApply, true);
  assert.equal(summary.readyToComplete, false);
  assert.match(summary.chatgptNextMessage, /Manually send/);
});

test('buildBrowserSessionSummary reports completed session after apply', () => {
  const summary = buildBrowserSessionSummary([applyItem, previewItem], insertion, applyBlockState);
  assert.equal(summary.latestJobId, 'APPLY_JOB');
  assert.equal(summary.applyJobId, 'APPLY_JOB');
  assert.equal(summary.previewHash, previewHash);
  assert.equal(summary.applyHash, previewHash);
  assert.equal(summary.readyToApply, true);
  assert.equal(summary.readyToComplete, true);
  assert.match(summary.chatgptNextMessage, /complete/);
  assert.equal(summary.recentJobs.length, 2);
});

test('formatBrowserSessionSummary is readable and includes next ChatGPT message', () => {
  const summary = buildBrowserSessionSummary([applyItem, previewItem], insertion, applyBlockState);
  const text = formatBrowserSessionSummary(summary);
  assert.match(text, /ULTIMATEBRIDGE SESSION SUMMARY/);
  assert.match(text, /readyToApply=true/);
  assert.match(text, /readyToComplete=true/);
  assert.match(text, /chatgptNextMessage=/);
  assert.match(text, /recentJobs:/);
});
