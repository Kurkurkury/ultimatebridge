import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import {
  buildDeliveryQueueItem,
  buildSafeChangeApplyBlock,
  findLatestPreviewQueueItem,
  formatDeliveryQueue
} from '../extension/src/delivery-queue.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-safe-change-builder-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'builder.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before builder', 'utf8');

const preview = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'BUILDER_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'BrowserSafeChangeBuilderPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/builder.txt', search: 'before', replace: 'after' }
    ]
  }
});

const item = buildDeliveryQueueItem(preview, '2026-01-01T00:00:00.000Z');
const latestPreview = findLatestPreviewQueueItem([item]);
const formattedQueue = formatDeliveryQueue([item]);
const applyBlock = buildSafeChangeApplyBlock(latestPreview, {
  requestId: 'BUILDER_APPLY',
  taskName: 'BrowserSafeChangeBuilderApply'
});
const applyRequest = JSON.parse(applyBlock);
const afterPreview = await fs.readFile(targetPath, 'utf8');
const apply = await handleMessage({ body: applyRequest });
const afterApply = await fs.readFile(targetPath, 'utf8');

console.log(JSON.stringify({
  root,
  configPath,
  preview,
  item,
  formattedQueue,
  applyBlock,
  apply,
  afterPreview,
  afterApply
}, null, 2));

if (!preview.ok || !item.isPreview || !item.previewHash || !applyRequest.requiredPreviewHash || afterPreview !== 'before builder' || !apply.ok || afterApply !== 'after builder') {
  process.exitCode = 1;
}
