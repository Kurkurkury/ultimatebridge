import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommandTemplateLibrary,
  formatCommandTemplateLibrary,
  getCommandTemplateById
} from '../extension/src/command-templates.js';
import { buildApplyBlockStateFromRequest } from '../extension/src/final-review-checklist.js';

const previewHash = '1'.repeat(64);
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
  approvedProjectRoot: 'C:/project',
  changes: [{ op: 'replaceText', path: 'file.txt', search: 'before', replace: 'after' }]
};

const insertion = { ok: true, submitted: false, hash: 'blockhash' };
const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'blockhash');

test('buildCommandTemplateLibrary exposes copy-only base templates for empty queue', () => {
  const library = buildCommandTemplateLibrary([], null, null);
  assert.equal(library.available, true);
  assert.equal(library.templateCount, 7);
  assert.equal(library.nextRecommendedTemplateId, 'safe-change-preview-skeleton');
  assert.equal(getCommandTemplateById(library, 'read-only-healthcheck').ready, true);
  assert.match(getCommandTemplateById(library, 'safe-change-preview-skeleton').copyText, /SAFE_CHANGE_PREVIEW/);
  assert.match(getCommandTemplateById(library, 'apply-from-latest-preview').copyText, /Run preview first/);
});

test('buildCommandTemplateLibrary builds latest preview apply template', () => {
  const library = buildCommandTemplateLibrary([previewItem], insertion, applyBlockState);
  const applyTemplate = getCommandTemplateById(library, 'apply-from-latest-preview');
  assert.equal(applyTemplate.ready, true);
  assert.match(applyTemplate.copyText, /"mode": "SAFE_CHANGE"/);
  assert.match(applyTemplate.copyText, /"requiredPreviewHash"/);
  assert.match(applyTemplate.copyText, /USER_MUST_REVIEW_AND_SEND_MANUALLY/);
});

test('buildCommandTemplateLibrary recommends session summary after completed apply', () => {
  const library = buildCommandTemplateLibrary([applyItem, previewItem], insertion, applyBlockState);
  assert.equal(library.nextRecommendedTemplateId, 'session-summary');
  assert.equal(getCommandTemplateById(library, 'rollback-restore-review').ready, true);
  assert.match(getCommandTemplateById(library, 'artifact-checklist').copyText, /rollbackPlan/);
  assert.match(getCommandTemplateById(library, 'session-summary').copyText, /readyToComplete=true/);
});

test('formatCommandTemplateLibrary shows safety boundary and template ids', () => {
  const library = buildCommandTemplateLibrary([applyItem, previewItem], insertion, applyBlockState);
  const text = formatCommandTemplateLibrary(library);
  assert.match(text, /ULTIMATEBRIDGE COMMAND TEMPLATE LIBRARY/);
  assert.match(text, /templateCount=7/);
  assert.match(text, /id=read-only-healthcheck/);
  assert.match(text, /id=apply-from-latest-preview/);
  assert.match(text, /manualBoundary=copy-only; user must review and send manually/);
});
