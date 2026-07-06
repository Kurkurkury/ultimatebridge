import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import { previewSafeChanges } from '../native-host/src/safe-change-preview.mjs';

async function withAllowlist(root, fn) {
  const allowlistPath = path.join(root, 'allowlist.json');
  await fs.writeFile(allowlistPath, JSON.stringify({
    protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
    allowedProjectRoots: [root]
  }, null, 2), 'utf8');

  const oldValue = process.env.ULTIMATEBRIDGE_PROJECT_ALLOWLIST_PATH;
  process.env.ULTIMATEBRIDGE_PROJECT_ALLOWLIST_PATH = allowlistPath;
  try {
    return await fn(allowlistPath);
  } finally {
    if (oldValue === undefined) delete process.env.ULTIMATEBRIDGE_PROJECT_ALLOWLIST_PATH;
    else process.env.ULTIMATEBRIDGE_PROJECT_ALLOWLIST_PATH = oldValue;
  }
}

test('SAFE_CHANGE_PREVIEW produces diff artifacts without writing target file', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-preview-'));
  const target = path.join(root, 'file.txt');
  await fs.writeFile(target, 'hello TOKEN', 'utf8');

  await withAllowlist(root, async () => {
    const response = await handleMessage({
      body: {
        protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
        requestId: 'PREVIEW1',
        mode: 'SAFE_CHANGE_PREVIEW',
        taskName: 'PreviewSmoke',
        approvedProjectRoot: root,
        changes: [
          { op: 'replaceText', path: 'file.txt', search: 'TOKEN', replace: 'VALUE' }
        ]
      }
    });

    assert.equal(response.ok, true);
    assert.equal(response.report.status, 'OK');
    assert.match(response.report.summary, /SAFE_CHANGE_PREVIEW changes=1/);
    assert.match(response.report.summary, /wouldWrite=true/);
    assert.equal(await fs.readFile(target, 'utf8'), 'hello TOKEN');
    assert.ok(response.manifest.items.some((item) => item.path.endsWith('safe-change-preview.json')));
    assert.ok(response.manifest.items.some((item) => item.path.endsWith('safe-change-preview.diff.txt')));
  });
});

test('previewSafeChanges supports new file previews without creating file', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-preview-new-'));
  const job = { jobId: 'PREVIEW2', runFolder: await fs.mkdtemp(path.join(os.tmpdir(), 'ub-preview-run-')) };
  const result = await previewSafeChanges({
    mode: 'SAFE_CHANGE_PREVIEW',
    approvedProjectRoot: root,
    changes: [
      { op: 'writeTextFile', path: 'new.txt', content: 'new content' }
    ]
  }, job);

  assert.equal(result.protocol, 'ULTIMATEBRIDGE_SAFE_CHANGE_PREVIEW_V1');
  assert.equal(result.changeCount, 1);
  assert.equal(result.wouldWrite, true);
  await assert.rejects(() => fs.readFile(path.join(root, 'new.txt'), 'utf8'), /ENOENT/);
});

test('SAFE_CHANGE_PREVIEW blocks non-allowlisted root', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-preview-deny-'));
  const otherRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-preview-allowed-other-'));
  await withAllowlist(otherRoot, async () => {
    const response = await handleMessage({
      body: {
        protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
        requestId: 'PREVIEW_DENY',
        mode: 'SAFE_CHANGE_PREVIEW',
        approvedProjectRoot: root,
        changes: [
          { op: 'writeTextFile', path: 'x.txt', content: 'x' }
        ]
      }
    });

    assert.equal(response.ok, false);
    assert.equal(response.code, 'PROJECT_ROOT_NOT_ALLOWLISTED');
  });
});
