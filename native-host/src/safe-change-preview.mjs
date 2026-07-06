import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveInsideRoot, policyError } from './path-policy.mjs';

export async function previewSafeChanges(request, job) {
  if (request.mode !== 'SAFE_CHANGE_PREVIEW') {
    throw policyError('NOT_SAFE_CHANGE_PREVIEW', 'previewSafeChanges only accepts SAFE_CHANGE_PREVIEW requests.');
  }

  if (!Array.isArray(request.changes) || request.changes.length === 0) {
    throw policyError('MISSING_CHANGES', 'SAFE_CHANGE_PREVIEW requires a non-empty changes array.');
  }

  const previews = [];
  for (const change of request.changes) {
    if (!change || typeof change !== 'object') {
      throw policyError('BAD_CHANGE', 'Each preview change must be an object.');
    }

    if (change.op === 'writeTextFile') {
      previews.push(await previewWriteTextFile(request, change));
      continue;
    }

    if (change.op === 'replaceText') {
      previews.push(await previewReplaceText(request, change));
      continue;
    }

    throw policyError('UNSUPPORTED_SAFE_CHANGE_OP', `Unsupported SAFE_CHANGE_PREVIEW operation: ${change.op}`);
  }

  const result = {
    protocol: 'ULTIMATEBRIDGE_SAFE_CHANGE_PREVIEW_V1',
    approvedProjectRoot: path.resolve(request.approvedProjectRoot),
    changeCount: previews.length,
    wouldWrite: previews.some((preview) => preview.wouldChange),
    previews
  };

  const jsonPath = path.join(job.runFolder, 'safe-change-preview.json');
  const diffPath = path.join(job.runFolder, 'safe-change-preview.diff.txt');
  await fs.writeFile(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  await fs.writeFile(diffPath, formatPreviewDiff(result), 'utf8');

  return { ...result, jsonPath, diffPath };
}

async function previewWriteTextFile(request, change) {
  const scoped = resolveInsideRoot(request.approvedProjectRoot, change.path);
  const before = await readExisting(scoped.target);
  const afterText = String(change.content ?? '');

  return buildPreview({
    op: 'writeTextFile',
    scoped,
    existedBefore: before.exists,
    beforeText: before.text,
    afterText
  });
}

async function previewReplaceText(request, change) {
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

  return buildPreview({
    op: 'replaceText',
    scoped,
    existedBefore: true,
    beforeText: before.text,
    afterText: before.text.replace(search, String(change.replace ?? ''))
  });
}

function buildPreview({ op, scoped, existedBefore, beforeText, afterText }) {
  return {
    op,
    path: scoped.relative,
    target: scoped.target,
    existedBefore,
    beforeBytes: Buffer.byteLength(beforeText, 'utf8'),
    afterBytes: Buffer.byteLength(afterText, 'utf8'),
    wouldChange: beforeText !== afterText,
    diff: buildSimpleDiff(scoped.relative, beforeText, afterText)
  };
}

function buildSimpleDiff(relativePath, beforeText, afterText) {
  const beforeLines = beforeText.split(/\r?\n/);
  const afterLines = afterText.split(/\r?\n/);
  const lines = [`--- ${relativePath}`, `+++ ${relativePath}`];
  const max = Math.max(beforeLines.length, afterLines.length);

  for (let index = 0; index < max; index += 1) {
    const beforeLine = beforeLines[index];
    const afterLine = afterLines[index];
    if (beforeLine === afterLine) {
      if (beforeLine !== undefined && beforeLine !== '') lines.push(` ${beforeLine}`);
      continue;
    }
    if (beforeLine !== undefined && beforeLine !== '') lines.push(`-${beforeLine}`);
    if (afterLine !== undefined && afterLine !== '') lines.push(`+${afterLine}`);
  }

  return lines.join('\n');
}

export function formatPreviewDiff(previewResult) {
  return [
    'ULTIMATEBRIDGE SAFE_CHANGE PREVIEW DIFF',
    `approvedProjectRoot=${previewResult.approvedProjectRoot}`,
    `changeCount=${previewResult.changeCount}`,
    `wouldWrite=${previewResult.wouldWrite}`,
    '',
    ...previewResult.previews.map((preview) => [
      `# ${preview.op} ${preview.path}`,
      `existedBefore=${preview.existedBefore}`,
      `beforeBytes=${preview.beforeBytes}`,
      `afterBytes=${preview.afterBytes}`,
      `wouldChange=${preview.wouldChange}`,
      preview.diff
    ].join('\n'))
  ].join('\n\n');
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
