import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArtifactUploadPlan,
  buildUploadInstructions,
  formatArtifactUploadPlan
} from '../extension/src/artifact-upload-plan.js';

const queueItem = {
  jobId: 'JOB_UPLOAD',
  status: 'OK',
  deliveryMode: 'direct',
  summary: 'ready to upload',
  chatTextPath: 'C:/run/chatgpt-response.txt',
  fullReportPath: 'C:/run/ultimatebridge-runner-report.json',
  artifacts: [
    { path: 'C:/run/ultimatebridge-runner-report.json', kind: 'json', size: 123, sha256: 'aaa', upload: true },
    { path: 'C:/run/stdout.txt', kind: 'text', size: 45, sha256: 'bbb', upload: true },
    { path: 'C:/run/internal.tmp', kind: 'text', size: 2, sha256: 'ccc', upload: false }
  ]
};

test('buildArtifactUploadPlan requires explicit queue item with uploadable artifacts', () => {
  assert.throws(() => buildArtifactUploadPlan(null), /queueItem is required/);
  assert.throws(() => buildArtifactUploadPlan({ jobId: 'EMPTY', artifacts: [] }), /No uploadable artifacts/);
});

test('buildArtifactUploadPlan creates user-confirmed manual upload plan', () => {
  const plan = buildArtifactUploadPlan(queueItem, { confirmedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(plan.protocol, 'ULTIMATEBRIDGE_USER_CONFIRMED_ARTIFACT_UPLOAD_PLAN_V1');
  assert.equal(plan.action, 'manual_upload_required');
  assert.equal(plan.userConfirmed, true);
  assert.equal(plan.jobId, 'JOB_UPLOAD');
  assert.equal(plan.artifactCount, 2);
  assert.equal(plan.artifacts.length, 2);
  assert.match(plan.instructions, /Upload or attach these files only after user confirmation/);
});

test('buildUploadInstructions and formatArtifactUploadPlan are readable', () => {
  const plan = buildArtifactUploadPlan(queueItem, { confirmedAt: '2026-01-01T00:00:00.000Z' });
  const instructions = buildUploadInstructions(plan);
  assert.match(instructions, /jobId=JOB_UPLOAD/);
  assert.match(formatArtifactUploadPlan(plan), /ultimatebridge-runner-report\.json/);
  assert.equal(formatArtifactUploadPlan(null), 'No artifact upload plan prepared.');
});
