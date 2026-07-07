import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRootAwareCommandTemplateLibrary,
  formatRootAwareCommandTemplateLibrary,
  getRootAwareCommandTemplateById
} from '../extension/src/root-aware-command-templates.js';
import { buildApplyBlockStateFromRequest } from '../extension/src/final-review-checklist.js';

const previewHash = '2'.repeat(64);
const projectRoot = 'C:/Users/noahr/Desktop/ChatGPT_Projekte/01_Aktive_Projekte/Projekt_024_UltimateBridge';
const previewItem = {
  isPreview: true,
  jobId: 'PREVIEW_JOB',
  status: 'OK',
  summary: 'SAFE_CHANGE_PREVIEW changes=1',
  previewHash,
  requiredPreviewHash: previewHash,
  previewJsonPath: 'C:/run/safe-change-preview.json',
  previewDiffPath: 'C:/run/safe-change-preview.diff.txt',
  approvedProjectRoot: projectRoot,
  previewChanges: [{ op: 'replaceText', path: 'file.txt', search: 'before', replace: 'after' }],
  artifacts: [
    { path: 'C:/run/ultimatebridge-runner-report.json', kind: 'json', size: 100, sha256: 'reporthash', upload: true },
    { path: 'C:/run/safe-change-preview.json', kind: 'json', size: 200, sha256: 'previewhash', upload: true },
    { path: 'C:/run/safe-change-preview.diff.txt', kind: 'text', size: 80, sha256: 'diffhash', upload: true }
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
  approvedProjectRoot: projectRoot,
  changes: [{ op: 'replaceText', path: 'file.txt', search: 'before', replace: 'after' }]
};

const insertion = { ok: true, submitted: false, hash: 'blockhash' };
const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'blockhash');

test('root aware command library uses stored root and inferred label without queue', () => {
  const library = buildRootAwareCommandTemplateLibrary([], null, null, { storedRoots: [projectRoot] });
  const previewTemplate = getRootAwareCommandTemplateById(library, 'safe-change-preview-skeleton');
  const parsed = JSON.parse(previewTemplate.copyText);

  assert.equal(library.rootAware, true);
  assert.equal(library.selectedLabel, 'P024 UltimateBridge');
  assert.equal(previewTemplate.rootLabel, 'P024 UltimateBridge');
  assert.equal(parsed.projectLabel, 'P024 UltimateBridge');
  assert.equal(parsed.approvedProjectRoot, projectRoot);
});

test('root aware command library annotates latest apply template', () => {
  const library = buildRootAwareCommandTemplateLibrary([previewItem], insertion, applyBlockState);
  const applyTemplate = getRootAwareCommandTemplateById(library, 'apply-from-latest-preview');
  const parsed = JSON.parse(applyTemplate.copyText);

  assert.equal(applyTemplate.ready, true);
  assert.equal(applyTemplate.rootLabel, 'P024 UltimateBridge');
  assert.equal(parsed.projectLabel, 'P024 UltimateBridge');
  assert.equal(parsed.mode, 'SAFE_CHANGE');
  assert.equal(parsed.sendBehavior, 'USER_MUST_REVIEW_AND_SEND_MANUALLY');
});

test('root aware command library respects custom labels', () => {
  const library = buildRootAwareCommandTemplateLibrary([], null, null, {
    storedRoots: [projectRoot],
    customLabels: { [projectRoot]: 'UltimateBridge Local' }
  });
  assert.equal(library.selectedLabel, 'UltimateBridge Local');
  assert.match(getRootAwareCommandTemplateById(library, 'safe-change-preview-skeleton').title, /UltimateBridge Local/);
});

test('formatRootAwareCommandTemplateLibrary exposes selected label and root', () => {
  const library = buildRootAwareCommandTemplateLibrary([previewItem], insertion, applyBlockState);
  const text = formatRootAwareCommandTemplateLibrary(library);
  assert.match(text, /ULTIMATEBRIDGE ROOT-AWARE COMMAND TEMPLATE LIBRARY/);
  assert.match(text, /rootAware=true/);
  assert.match(text, /selectedLabel=P024 UltimateBridge/);
  assert.match(text, /selectedRoot=C:\/Users\/noahr/);
});
