import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArtifactOpenPlan, formatArtifactOpenPlan } from '../extension/src/artifact-open-plan.js';

const previewItem = {
  isPreview: true,
  jobId: 'PREVIEW_JOB',
  previewHash: 'd'.repeat(64),
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
  previewHash: 'd'.repeat(64),
  artifacts: [
    { path: 'C:/run/ultimatebridge-runner-report.json', kind: 'json', size: 110, sha256: 'applyreporthash', upload: true },
    { path: 'C:/run/safe-change-result.json', kind: 'json', size: 220, sha256: 'resulthash', upload: true },
    { path: 'C:/run/rollback-plan.json', kind: 'json', size: 330, sha256: 'rollbackhash', upload: true },
    { path: 'C:/run/rollback-restore-command.txt', kind: 'text', size: 90, sha256: 'cmdhash', upload: true }
  ]
};

test('buildArtifactOpenPlan reports no artifacts when queue is empty', () => {
  const plan = buildArtifactOpenPlan([]);
  assert.equal(plan.available, false);
  assert.equal(plan.reason, 'NO_ARTIFACTS_AVAILABLE');
  assert.match(plan.nextReview, /Run/);
});

test('buildArtifactOpenPlan summarizes preview and apply artifacts', () => {
  const plan = buildArtifactOpenPlan([applyItem, previewItem]);
  assert.equal(plan.available, true);
  assert.equal(plan.previewJobId, 'PREVIEW_JOB');
  assert.equal(plan.applyJobId, 'APPLY_JOB');
  assert.equal(plan.previewHash, 'd'.repeat(64));
  assert.equal(plan.applyHash, 'd'.repeat(64));
  assert.equal(plan.artifacts.length, 7);
  assert.equal(plan.artifacts.some((artifact) => artifact.role === 'previewDiff'), true);
  assert.equal(plan.artifacts.some((artifact) => artifact.role === 'applyResult'), true);
  assert.equal(plan.artifacts.some((artifact) => artifact.role === 'rollbackPlan'), true);
  assert.match(plan.nextReview, /rollback plan/);
});

test('formatArtifactOpenPlan is readable and action oriented', () => {
  const plan = buildArtifactOpenPlan([applyItem, previewItem]);
  const text = formatArtifactOpenPlan(plan);
  assert.match(text, /ULTIMATEBRIDGE ARTIFACT OPEN\/UPLOAD PLAN/);
  assert.match(text, /available=true/);
  assert.match(text, /role=previewDiff/);
  assert.match(text, /Review before building or sending apply block/);
  assert.match(text, /role=rollbackPlan/);
  assert.match(text, /Keep for recovery/);
});
