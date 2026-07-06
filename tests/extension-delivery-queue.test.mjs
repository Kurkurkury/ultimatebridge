import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeliveryQueueItem,
  buildManualSendGuardText,
  buildPreviewApplyHint,
  buildSafeChangeApplyBlock,
  findLatestPreviewQueueItem,
  mergeDeliveryQueue,
  formatDeliveryQueue,
  formatDeliveryResponse,
  MANUAL_REVIEW_REQUIRED
} from '../extension/src/delivery-queue.js';

const PREVIEW_HASH = 'a'.repeat(64);

const nativeResponse = {
  ok: true,
  report: {
    jobId: 'JOB1',
    status: 'OK',
    summary: 'first line\nsecond line'
  },
  deliveryPlan: {
    jobId: 'JOB1',
    deliveryMode: 'staged_artifacts',
    chatTextPath: 'C:/run/chatgpt-response.txt',
    fullReportPath: 'C:/run/ultimatebridge-runner-report.json',
    artifacts: [
      { path: 'C:/run/ultimatebridge-runner-report.json', kind: 'json', size: 100, sha256: 'aaa', upload: true },
      { path: 'C:/run/internal.tmp', kind: 'text', size: 5, sha256: 'bbb', upload: false }
    ]
  }
};

const previewNativeResponse = {
  ok: true,
  request: {
    approvedProjectRoot: 'C:/project',
    changes: [
      { op: 'replaceText', path: 'file.txt', search: 'before', replace: 'after' }
    ]
  },
  report: {
    jobId: 'PREVIEW1',
    status: 'OK',
    summary: [
      'SAFE_CHANGE_PREVIEW changes=1',
      `previewHash=${PREVIEW_HASH}`,
      `requiredPreviewHash=${PREVIEW_HASH}`,
      'wouldWrite=true'
    ].join('\n')
  },
  deliveryPlan: {
    jobId: 'PREVIEW1',
    deliveryMode: 'direct',
    artifacts: [
      { path: 'C:/run/safe-change-preview.json', kind: 'json', size: 200, sha256: 'jsonhash', upload: true },
      { path: 'C:/run/safe-change-preview.diff.txt', kind: 'text', size: 80, sha256: 'diffhash', upload: true }
    ]
  }
};

test('buildDeliveryQueueItem extracts delivery plan and uploadable artifacts', () => {
  const item = buildDeliveryQueueItem(nativeResponse, '2026-01-01T00:00:00.000Z');
  assert.equal(item.jobId, 'JOB1');
  assert.equal(item.status, 'OK');
  assert.equal(item.deliveryMode, 'staged_artifacts');
  assert.equal(item.artifactCount, 2);
  assert.equal(item.artifacts.length, 1);
  assert.equal(item.summary, 'first line');
});

test('buildDeliveryQueueItem extracts preview hash, request, and preview artifacts', () => {
  const item = buildDeliveryQueueItem(previewNativeResponse, '2026-01-01T00:00:00.000Z');
  assert.equal(item.isPreview, true);
  assert.equal(item.previewHash, PREVIEW_HASH);
  assert.equal(item.requiredPreviewHash, PREVIEW_HASH);
  assert.equal(item.requiredPreviewHash, item.previewHash);
  assert.equal(item.previewJsonPath, 'C:/run/safe-change-preview.json');
  assert.equal(item.previewDiffPath, 'C:/run/safe-change-preview.diff.txt');
  assert.equal(item.approvedProjectRoot, 'C:/project');
  assert.equal(item.previewChanges.length, 1);
});

test('findLatestPreviewQueueItem and buildPreviewApplyHint expose required hash', () => {
  const item = buildDeliveryQueueItem(previewNativeResponse, '2026-01-01T00:00:00.000Z');
  const latest = findLatestPreviewQueueItem([buildDeliveryQueueItem(nativeResponse), item]);
  const hint = buildPreviewApplyHint(latest);
  assert.match(hint, /ULTIMATEBRIDGE PREVIEW APPLY REQUIREMENT/);
  assert.match(hint, /requiredPreviewHash/);
  assert.match(hint, /safe-change-preview\.diff\.txt/);
});

test('buildSafeChangeApplyBlock builds matching SAFE_CHANGE JSON with manual review guard', () => {
  const item = buildDeliveryQueueItem(previewNativeResponse, '2026-01-01T00:00:00.000Z');
  const block = buildSafeChangeApplyBlock(item, { requestId: 'APPLY1', taskName: 'ApplyTest' });
  const parsed = JSON.parse(block);
  assert.equal(parsed.protocol, 'ULTIMATEBRIDGE_REQUEST_V1');
  assert.equal(parsed.mode, 'SAFE_CHANGE');
  assert.equal(parsed.requestId, 'APPLY1');
  assert.equal(parsed.taskName, 'ApplyTest');
  assert.equal(parsed.manualReviewRequired, true);
  assert.equal(parsed.sendBehavior, MANUAL_REVIEW_REQUIRED);
  assert.equal(parsed.sourcePreviewJobId, 'PREVIEW1');
  assert.equal(parsed.approvedProjectRoot, 'C:/project');
  assert.equal(parsed.requiredPreviewHash, item.previewHash);
  assert.deepEqual(parsed.changes, item.previewChanges);
});

test('buildManualSendGuardText explains manual review requirement', () => {
  const text = buildManualSendGuardText();
  assert.match(text, /MANUAL SEND GUARD/);
  assert.match(text, /must not submit/);
  assert.match(text, /Review the block yourself/);
});

test('mergeDeliveryQueue replaces duplicate job id and preserves newest first', () => {
  const oldItem = { jobId: 'JOB1', id: 'old' };
  const otherItem = { jobId: 'JOB2', id: 'other' };
  const newItem = { jobId: 'JOB1', id: 'new' };
  const queue = mergeDeliveryQueue([oldItem, otherItem], newItem);
  assert.deepEqual(queue.map((item) => item.id), ['new', 'other']);
});

test('formatDeliveryQueue produces readable queue output', () => {
  const item = buildDeliveryQueueItem(nativeResponse, '2026-01-01T00:00:00.000Z');
  const text = formatDeliveryQueue([item]);
  assert.match(text, /jobId=JOB1/);
  assert.match(text, /deliveryMode=staged_artifacts/);
  assert.match(text, /ultimatebridge-runner-report\.json/);
});

test('formatDeliveryQueue includes preview apply fields', () => {
  const item = buildDeliveryQueueItem(previewNativeResponse, '2026-01-01T00:00:00.000Z');
  const text = formatDeliveryQueue([item]);
  assert.match(text, /preview=true/);
  assert.match(text, /previewHash=/);
  assert.match(text, /approvedProjectRoot=/);
  assert.match(text, /previewChanges=1/);
  assert.match(text, /previewDiffPath=/);
});

test('formatDeliveryResponse handles service worker wrapped responses', () => {
  const text = formatDeliveryResponse({ ok: true, response: nativeResponse });
  assert.match(text, /status=OK/);
  assert.match(text, /jobId=JOB1/);
});
