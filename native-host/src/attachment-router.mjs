import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ATTACHMENT_PROTOCOL } from '../../common/constants.mjs';

export async function buildAttachmentManifest(jobId, filePaths) {
  const items = [];

  for (const filePath of filePaths) {
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || stat.size === 0) {
      continue;
    }

    const buffer = await fs.readFile(filePath);
    items.push({
      path: filePath,
      kind: inferKind(filePath),
      size: stat.size,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      upload: true,
      reason: 'staged_artifact'
    });
  }

  return {
    protocol: ATTACHMENT_PROTOCOL,
    jobId,
    items
  };
}

export async function writeAttachmentManifest(runFolder, manifest) {
  const manifestPath = path.join(runFolder, 'attachment-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifestPath;
}

function inferKind(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return 'image';
  if (['.json'].includes(ext)) return 'json';
  if (['.txt', '.md', '.log'].includes(ext)) return 'text';
  if (['.zip'].includes(ext)) return 'archive';
  return 'file';
}
