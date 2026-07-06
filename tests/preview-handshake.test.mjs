import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import { computePreviewHash } from '../native-host/src/preview-hash.mjs';

async function withAllowlist(root, fn) {
  const allowlistPath = path.join(root, 'allowlist.json');
  await fs.writeFile(allowlistPath, JSON.stringify({
    protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
    allowedProjectRoots: [root]
  }, null, 2), 'utf8');

  const oldValue = process.env.ULTIMATEBRIDGE_PROJECT_ALLOWLIST_PATH;
  process.env.ULTIMATEBRIDGE_PROJECT_ALLOWLIST_PATH = allowlistPath;
  try {
    return await fn();
  } finally {
    if (oldValue === undefined) delete process.env.ULTIMATEBRIDGE_PROJECT_ALLOWLIST_PATH;
    else process.env.ULTIMATEBRIDGE_PROJECT_ALLOWLIST_PATH = oldValue;
  }
}

function requestFor(root, mode, requiredPreviewHash) {
  return {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: `${mode}_TEST`,
    mode,
    taskName: mode,
    approvedProjectRoot: root,
    ...(requiredPreviewHash ? { requiredPreviewHash } : {}),
    changes: [{ op: 'replaceText', path: 'file.txt', search: 'before', replace: 'after' }]
  };
}

test('preview hash is stable between preview and apply requests', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-handshake-hash-'));
  assert.equal(
    computePreviewHash(requestFor(root, 'SAFE_CHANGE_PREVIEW')),
    computePreviewHash(requestFor(root, 'SAFE_CHANGE'))
  );
});

test('safe change applies when preview hash matches', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-handshake-ok-'));
  await fs.writeFile(path.join(root, 'file.txt'), 'before value', 'utf8');

  await withAllowlist(root, async () => {
    const preview = await handleMessage({ body: requestFor(root, 'SAFE_CHANGE_PREVIEW') });
    assert.equal(preview.ok, true);
    const previewArtifact = preview.manifest.items.find((item) => item.path.endsWith('safe-change-preview.json'));
    const previewHash = JSON.parse(await fs.readFile(previewArtifact.path, 'utf8')).previewHash;

    const applied = await handleMessage({ body: requestFor(root, 'SAFE_CHANGE', previewHash) });
    assert.equal(applied.ok, true);
    assert.match(applied.report.summary, /previewHashMatched=true/);
    assert.equal(await fs.readFile(path.join(root, 'file.txt'), 'utf8'), 'after value');
  });
});

test('safe change with nonmatching preview hash is blocked before write', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-handshake-stop-'));
  await fs.writeFile(path.join(root, 'file.txt'), 'before value', 'utf8');

  await withAllowlist(root, async () => {
    const response = await handleMessage({ body: requestFor(root, 'SAFE_CHANGE', '0'.repeat(64)) });
    assert.equal(response.ok, false);
    assert.equal(response.code, 'PREVIEW_HASH_MISMATCH');
    assert.equal(await fs.readFile(path.join(root, 'file.txt'), 'utf8'), 'before value');
  });
});
