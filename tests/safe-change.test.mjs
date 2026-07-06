import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveInsideRoot } from '../native-host/src/path-policy.mjs';
import { handleMessage } from '../native-host/src/host.mjs';

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

test('path policy blocks escaping approved root', () => {
  const root = path.join(os.tmpdir(), 'ub-safe-root');
  assert.throws(() => resolveInsideRoot(root, '../escape.txt'), /escapes approvedProjectRoot/i);
});

test('safe change writes text file inside allowlisted approved root', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-safe-change-'));
  await withAllowlist(root, async () => {
    const response = await handleMessage({
      body: {
        protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
        requestId: 'SAFE1',
        mode: 'SAFE_CHANGE',
        approvedProjectRoot: root,
        changes: [
          { op: 'writeTextFile', path: 'notes/result.txt', content: 'hello safe change' }
        ]
      }
    });

    assert.equal(response.ok, true);
    assert.equal(response.report.status, 'OK');
    assert.match(response.report.summary, /allowlistMatchedRoot=/);
    assert.match(response.report.summary, /rollbackPlanPath=/);
    assert.match(response.report.summary, /restoreCommand=/);
    const written = await fs.readFile(path.join(root, 'notes', 'result.txt'), 'utf8');
    assert.equal(written, 'hello safe change');
    assert.ok(response.manifest.items.some((item) => item.path.endsWith('safe-change-result.json')));
    assert.ok(response.manifest.items.some((item) => item.path.endsWith('rollback-plan.json')));
    assert.ok(response.manifest.items.some((item) => item.path.endsWith('rollback-restore-command.txt')));
  });
});

test('safe change replaceText creates backup inside allowlisted root', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-safe-replace-'));
  await fs.writeFile(path.join(root, 'file.txt'), 'before TOKEN after', 'utf8');

  await withAllowlist(root, async () => {
    const response = await handleMessage({
      body: {
        protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
        requestId: 'SAFE2',
        mode: 'SAFE_CHANGE',
        approvedProjectRoot: root,
        changes: [
          { op: 'replaceText', path: 'file.txt', search: 'TOKEN', replace: 'VALUE' }
        ]
      }
    });

    assert.equal(response.ok, true);
    const changed = await fs.readFile(path.join(root, 'file.txt'), 'utf8');
    assert.equal(changed, 'before VALUE after');
    const backupPath = response.report.summary.match(/backupRoot=(.*)/)?.[1]?.split('\n')?.[0];
    assert.ok(backupPath);
    assert.ok(response.manifest.items.some((item) => item.path.endsWith('rollback-plan.json')));
  });
});

test('safe change blocks missing approved root', async () => {
  const response = await handleMessage({
    body: {
      protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
      requestId: 'SAFE3',
      mode: 'SAFE_CHANGE',
      changes: [{ op: 'writeTextFile', path: 'x.txt', content: 'x' }]
    }
  });

  assert.equal(response.ok, false);
  assert.equal(response.code, 'MISSING_APPROVED_PROJECT_ROOT');
});

test('safe change blocks non-allowlisted root before writing', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-safe-not-allowed-'));
  const otherRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-safe-allowed-other-'));
  await withAllowlist(otherRoot, async () => {
    const response = await handleMessage({
      body: {
        protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
        requestId: 'SAFE_DENY',
        mode: 'SAFE_CHANGE',
        approvedProjectRoot: root,
        changes: [{ op: 'writeTextFile', path: 'x.txt', content: 'x' }]
      }
    });

    assert.equal(response.ok, false);
    assert.equal(response.code, 'PROJECT_ROOT_NOT_ALLOWLISTED');
  });
});

test('safe change blocks outside write after allowlist check', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-safe-block-'));
  await withAllowlist(root, async () => {
    const response = await handleMessage({
      body: {
        protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
        requestId: 'SAFE4',
        mode: 'SAFE_CHANGE',
        approvedProjectRoot: root,
        changes: [{ op: 'writeTextFile', path: '../x.txt', content: 'x' }]
      }
    });

    assert.equal(response.ok, false);
    assert.equal(response.code, 'TARGET_OUTSIDE_APPROVED_ROOT');
  });
});
