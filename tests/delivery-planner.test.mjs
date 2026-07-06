import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeDeliveryArtifacts } from '../native-host/src/delivery-planner.mjs';

test('delivery planner writes direct delivery artifacts', async () => {
  const runFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-delivery-direct-'));
  const job = { jobId: 'JOB_DIRECT', runFolder };
  const report = {
    protocol: 'ULTIMATEBRIDGE_RUNNER_REPORT_V1',
    jobId: 'JOB_DIRECT',
    status: 'OK',
    summary: 'small report'
  };
  const manifest = { items: [] };

  const result = await writeDeliveryArtifacts(job, report, manifest, { directLimit: 1000 });
  assert.equal(result.plan.deliveryMode, 'direct');
  assert.ok(result.chatText.includes('ULTIMATEBRIDGE DELIVERY'));
  assert.ok(await exists(result.planPath));
  assert.ok(await exists(result.plan.chatTextPath));
});

test('delivery planner stages large delivery artifacts', async () => {
  const runFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-delivery-large-'));
  const job = { jobId: 'JOB_LARGE', runFolder };
  const report = {
    protocol: 'ULTIMATEBRIDGE_RUNNER_REPORT_V1',
    jobId: 'JOB_LARGE',
    status: 'OK',
    summary: 'large report ' + 'x'.repeat(5000)
  };
  const manifest = {
    items: [
      { path: path.join(runFolder, 'full.txt'), kind: 'text', size: 5000, sha256: 'abc', upload: true }
    ]
  };

  const result = await writeDeliveryArtifacts(job, report, manifest, { directLimit: 100 });
  assert.equal(result.plan.deliveryMode, 'staged_artifacts');
  assert.ok(result.chatText.includes('Full report exceeded direct limit'));
  assert.equal(result.plan.artifactCount, 1);
});

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
