import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-handshake-smoke-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'handshake.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before handshake', 'utf8');

function request(mode, requiredPreviewHash) {
  return {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: mode === 'SAFE_CHANGE_PREVIEW' ? 'HANDSHAKE_PREVIEW' : 'HANDSHAKE_APPLY',
    mode,
    taskName: mode === 'SAFE_CHANGE_PREVIEW' ? 'HandshakePreviewSmoke' : 'HandshakeApplySmoke',
    approvedProjectRoot: root,
    ...(requiredPreviewHash ? { requiredPreviewHash } : {}),
    changes: [
      { op: 'replaceText', path: 'notes/handshake.txt', search: 'before', replace: 'after' }
    ]
  };
}

const preview = await handleMessage({ body: request('SAFE_CHANGE_PREVIEW') });
const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewJsonItem = preview.manifest.items.find((item) => item.path.endsWith('safe-change-preview.json'));
const previewJson = JSON.parse(await fs.readFile(previewJsonItem.path, 'utf8'));
const apply = await handleMessage({ body: request('SAFE_CHANGE', previewJson.previewHash) });
const afterApply = await fs.readFile(targetPath, 'utf8');

await fs.writeFile(targetPath, 'before handshake', 'utf8');
const mismatch = await handleMessage({ body: request('SAFE_CHANGE', '0'.repeat(64)) });
const afterMismatch = await fs.readFile(targetPath, 'utf8');

console.log(JSON.stringify({
  root,
  configPath,
  preview,
  previewHash: previewJson.previewHash,
  afterPreview,
  apply,
  afterApply,
  mismatch,
  afterMismatch
}, null, 2));

if (!preview.ok || afterPreview !== 'before handshake' || !apply.ok || afterApply !== 'after handshake' || mismatch.ok || mismatch.code !== 'PREVIEW_HASH_MISMATCH' || afterMismatch !== 'before handshake') {
  process.exitCode = 1;
}
