import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import {
  buildDeliveryQueueItem,
  buildSafeChangeApplyBlock,
  findLatestPreviewQueueItem
} from '../extension/src/delivery-queue.js';
import {
  buildBrowserRoundtripProof,
  formatBrowserRoundtripProof
} from '../extension/src/roundtrip-proof.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-full-roundtrip-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'roundtrip.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before roundtrip', 'utf8');

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'FULL_ROUNDTRIP_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'FullBrowserRoundtripPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/roundtrip.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const latestPreview = findLatestPreviewQueueItem([previewQueueItem]);
const applyBlock = buildSafeChangeApplyBlock(latestPreview, {
  requestId: 'FULL_ROUNDTRIP_APPLY',
  taskName: 'FullBrowserRoundtripApply'
});
const applyRequest = JSON.parse(applyBlock);

const insertion = {
  ok: true,
  submitted: false,
  hash: sha256Hex(applyBlock)
};

const applyResponse = await handleMessage({ body: applyRequest });
const afterApply = await fs.readFile(targetPath, 'utf8');
const applyQueueItem = buildDeliveryQueueItem(applyResponse, '2026-01-01T00:00:01.000Z');
const proof = buildBrowserRoundtripProof({
  previewResponse,
  previewQueueItem,
  applyRequest,
  insertion,
  applyResponse,
  applyQueueItem
});
const formattedProof = formatBrowserRoundtripProof(proof);

const result = {
  root,
  configPath,
  afterPreview,
  afterApply,
  previewQueueItem,
  applyRequest,
  insertion,
  applyQueueItem,
  proof,
  formattedProof
};

console.log(JSON.stringify(result, null, 2));
console.log('\n' + formattedProof);

if (
  afterPreview !== 'before roundtrip' ||
  afterApply !== 'after roundtrip' ||
  !proof.allOk ||
  proof.insertion.submitted !== false ||
  proof.applyBlock.manualReviewRequired !== true ||
  proof.applyBlock.sendBehavior !== 'USER_MUST_REVIEW_AND_SEND_MANUALLY' ||
  proof.apply.previewHashMatched !== true
) {
  process.exitCode = 1;
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}
