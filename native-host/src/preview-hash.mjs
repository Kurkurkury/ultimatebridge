import crypto from 'node:crypto';
import path from 'node:path';

export function buildPreviewHashPayload(request) {
  return {
    protocol: 'ULTIMATEBRIDGE_PREVIEW_HASH_PAYLOAD_V1',
    approvedProjectRoot: path.resolve(request.approvedProjectRoot),
    changes: normalizeChanges(request.changes ?? [])
  };
}

export function computePreviewHash(request) {
  const payload = buildPreviewHashPayload(request);
  return crypto.createHash('sha256').update(stableStringify(payload), 'utf8').digest('hex');
}

export function assertPreviewHashMatches(request) {
  if (!request.requiredPreviewHash) {
    return {
      required: false,
      previewHash: computePreviewHash(request),
      requiredPreviewHash: null,
      matched: null
    };
  }

  const previewHash = computePreviewHash(request);
  const requiredPreviewHash = String(request.requiredPreviewHash);
  if (previewHash !== requiredPreviewHash) {
    const error = new Error(`SAFE_CHANGE requiredPreviewHash mismatch. expected=${requiredPreviewHash} actual=${previewHash}`);
    error.code = 'PREVIEW_HASH_MISMATCH';
    error.status = 'BLOCKED';
    throw error;
  }

  return {
    required: true,
    previewHash,
    requiredPreviewHash,
    matched: true
  };
}

function normalizeChanges(changes) {
  return changes.map((change) => ({
    op: String(change.op ?? ''),
    path: String(change.path ?? ''),
    content: change.content === undefined ? null : String(change.content),
    search: change.search === undefined ? null : String(change.search),
    replace: change.replace === undefined ? null : String(change.replace)
  }));
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}
