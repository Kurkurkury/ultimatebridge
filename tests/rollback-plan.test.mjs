import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildRollbackPlan, applyRollbackPlan } from '../native-host/src/rollback-plan.mjs';

test('rollback plan restores modified text file from backup', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-rollback-restore-'));
  const backupRoot = path.join(root, 'backups');
  await fs.mkdir(backupRoot, { recursive: true });

  const target = path.join(root, 'file.txt');
  const backupPath = path.join(backupRoot, 'file.txt.bak');
  await fs.writeFile(target, 'new text', 'utf8');
  await fs.writeFile(backupPath, 'old text', 'utf8');

  const plan = buildRollbackPlan(
    { jobId: 'ROLLBACK1', runFolder: root },
    {
      approvedProjectRoot: root,
      backupRoot,
      changes: [{
        op: 'replaceText',
        path: 'file.txt',
        target,
        existedBefore: true,
        backupPath,
        beforeBytes: 8,
        afterBytes: 8
      }]
    },
    path.join(root, 'rollback-plan.json')
  );

  const result = await applyRollbackPlan(plan);
  assert.equal(result.protocol, 'ULTIMATEBRIDGE_ROLLBACK_RESTORE_RESULT_V1');
  assert.equal(result.operationCount, 1);
  assert.equal(await fs.readFile(target, 'utf8'), 'old text');
});

test('rollback plan deletes files created by SAFE_CHANGE', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-rollback-delete-'));
  const target = path.join(root, 'created.txt');
  await fs.writeFile(target, 'created', 'utf8');

  const plan = buildRollbackPlan(
    { jobId: 'ROLLBACK2', runFolder: root },
    {
      approvedProjectRoot: root,
      backupRoot: path.join(root, 'backups'),
      changes: [{
        op: 'writeTextFile',
        path: 'created.txt',
        target,
        existedBefore: false,
        backupPath: null,
        beforeBytes: 0,
        afterBytes: 7
      }]
    },
    path.join(root, 'rollback-plan.json')
  );

  await applyRollbackPlan(plan);
  await assert.rejects(() => fs.readFile(target, 'utf8'), /ENOENT/);
});

test('rollback plan dry run does not change files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ub-rollback-dry-'));
  const backupRoot = path.join(root, 'backups');
  await fs.mkdir(backupRoot, { recursive: true });

  const target = path.join(root, 'file.txt');
  const backupPath = path.join(backupRoot, 'file.txt.bak');
  await fs.writeFile(target, 'new text', 'utf8');
  await fs.writeFile(backupPath, 'old text', 'utf8');

  const plan = buildRollbackPlan(
    { jobId: 'ROLLBACK3', runFolder: root },
    {
      approvedProjectRoot: root,
      backupRoot,
      changes: [{
        op: 'replaceText',
        path: 'file.txt',
        target,
        existedBefore: true,
        backupPath,
        beforeBytes: 8,
        afterBytes: 8
      }]
    },
    path.join(root, 'rollback-plan.json')
  );

  const result = await applyRollbackPlan(plan, { dryRun: true });
  assert.equal(result.dryRun, true);
  assert.equal(await fs.readFile(target, 'utf8'), 'new text');
});
