import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import {
  buildDeliveryQueueItem,
  buildPreviewApplyHint,
  findLatestPreviewQueueItem,
  formatDeliveryQueue
} from '../extension/src/delivery-queue.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-extension-preview-ui-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'preview-ui.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before ui', 'utf8');

const response = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'EXT_PREVIEW_UI',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'ExtensionPreviewUiSmoke',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/preview-ui.txt', search: 'before', replace: 'after' }
    ]
  }
});

const item = buildDeliveryQueueItem(response, '2026-01-01T00:00:00.000Z');
const queue = [item];
const latestPreview = findLatestPreviewQueueItem(queue);
const formattedQueue = formatDeliveryQueue(queue);
const applyHint = buildPreviewApplyHint(latestPreview);
const afterPreview = await fs.readFile(targetPath, 'utf8');

console.log(JSON.stringify({
  root,
  configPath,
  response,
  item,
  formattedQueue,
  applyHint,
  afterPreview
}, null, 2));

if (!response.ok || !item.isPreview || !item.previewHash || !item.previewDiffPath || !applyHint.includes('requiredPreviewHash') || afterPreview !== 'before ui') {
  process.exitCode = 1;
}
