import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeliveryQueueItem,
  mergeDeliveryQueue,
  formatDeliveryQueue,
  formatDeliveryResponse
} from '../extension/src/delivery-queue.js';

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

test('buildDeliveryQueueItem extracts delivery plan and uploadable artifacts', () => {
  const item = buildDeliveryQueueItem(nativeResponse, '2026-01-01T00:00:00.000Z');
  assert.equal(item.jobId, 'JOB1');
  assert.equal(item.status, 'OK');
  assert.equal(item.deliveryMode, 'staged_artifacts');
  assert.equal(item.artifactCount, 2);
  assert.equal(item.artifacts.length, 1);
  assert.equal(item.summary, 'first line');
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

test('formatDeliveryResponse handles service worker wrapped responses', () => {
  const text = formatDeliveryResponse({ ok: true, response: nativeResponse });
  assert.match(text, /status=OK/);
  assert.match(text, /jobId=JOB1/);
});
