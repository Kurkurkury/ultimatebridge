import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveInsideRoot, policyError } from './path-policy.mjs';

export async function applySafeChanges(request, job) {
  if (request.mode !== 'SAFE_CHANGE') {
    throw policyError('NOT_SAFE_CHANGE', 'applySafeChanges only accepts SAFE_CHANGE requests.');
  }

  if (!Array.isArray(request.changes) || request.changes.length === 0) {
    throw policyError('MISSING_CHANGES', 'SAFE_CHANGE requires a non-empty changes array.');
  }

  const backupRoot = path.join(job.runFolder, 'backups');
  await fs.mkdir(backupRoot, { recursive: true });

  const results = [];

  for (const change of request.changes) {
    if (!change || typeof change !== 'object') {
      throw policyError('BAD_CHANGE', 'Each change must be an object.');
    }

    if (change.op === 'writeTextFile') {
      results.push(await writeTextFile(request, change, backupRoot));
      continue;
    }

    if (change.op === 'replaceText') {
      results.push(await replaceText(request, change, backupRoot));
      continue;
    }

    throw policyError('UNSUPPORTED_SAFE_CHANGE_OP', `Unsupported SAFE_CHANGE operation: ${change.op}`);
  }

  const summary = {
    protocol: 'ULTIMATEBRIDGE_SAFE_CHANGE_RESULT_V1',
    approvedProjectRoot: path.resolve(request.approvedProjectRoot),
    backupRoot,
    changes: results
  };

  await fs.writeFile(path.join(job.runFolder, 'safe-change-result.json'), JSON.stringify(summary, null, 2), 'utf8');
  return summary;
}

async function writeTextFile(request, change, backupRoot) {
  const scoped = resolveInsideRoot(request.approvedProjectRoot, change.path);
  const before = await readExisting(scoped.target);
  const backupPath = await backupExisting(scoped, backupRoot, before);
  const nextText = String(change.content ?? '');

  await fs.mkdir(path.dirname(scoped.target), { recursive: true });
  await fs.writeFile(scoped.target, nextText, 'utf8');

  return {
    op: 'writeTextFile',
    path: scoped.relative,
    target: scoped.target,
    existedBefore: before.exists,
    backupPath,
    beforeBytes: before.exists ? Buffer.byteLength(before.text, 'utf8') : 0,
    afterBytes: Buffer.byteLength(nextText, 'utf8')
  };
}

async function replaceText(request, change, backupRoot) {
  const scoped = resolveInsideRoot(request.approvedProjectRoot, change.path);
  const before = await readExisting(scoped.target);

  if (!before.exists) {
    throw policyError('REPLACE_TARGET_MISSING', `replaceText target does not exist: ${scoped.relative}`);
  }

  const search = String(change.search ?? '');
  if (!search) {
    throw policyError('EMPTY_REPLACE_SEARCH', 'replaceText requires a non-empty search string.');
  }

  if (!before.text.includes(search)) {
    throw policyError('REPLACE_SEARCH_NOT_FOUND', `replaceText search string not found in ${scoped.relative}`);
  }

  const backupPath = await backupExisting(scoped, backupRoot, before);
  const replacement = String(change.replace ?? '');
  const nextText = before.text.replace(search, replacement);
  await fs.writeFile(scoped.target, nextText, 'utf8');

  return {
    op: 'replaceText',
    path: scoped.relative,
    target: scoped.target,
    existedBefore: true,
    backupPath,
    beforeBytes: Buffer.byteLength(before.text, 'utf8'),
    afterBytes: Buffer.byteLength(nextText, 'utf8')
  };
}

async function readExisting(target) {
  try {
    const text = await fs.readFile(target, 'utf8');
    return { exists: true, text };
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, text: '' };
    throw error;
  }
}

async function backupExisting(scoped, backupRoot, before) {
  if (!before.exists) return null;

  const backupPath = path.join(backupRoot, scoped.relative.replace(/[\\/:*?"<>|]/g, '_') + '.bak');
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.writeFile(backupPath, before.text, 'utf8');
  return backupPath;
}
