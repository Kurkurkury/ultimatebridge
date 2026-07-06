import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import {
  buildDeliveryQueueItem,
  buildManualSendGuardText,
  buildSafeChangeApplyBlock,
  findLatestPreviewQueueItem,
  MANUAL_REVIEW_REQUIRED
} from '../extension/src/delivery-queue.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-manual-send-guard-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'manual-send.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before manual guard', 'utf8');

const preview = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'MANUAL_GUARD_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'ManualSendGuardPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/manual-send.txt', search: 'before', replace: 'after' }
    ]
  }
});

const item = buildDeliveryQueueItem(preview, '2026-01-01T00:00:00.000Z');
const latestPreview = findLatestPreviewQueueItem([item]);
const applyBlock = buildSafeChangeApplyBlock(latestPreview, {
  requestId: 'MANUAL_GUARD_APPLY',
  taskName: 'ManualSendGuardApply'
});
const applyRequest = JSON.parse(applyBlock);
const afterPreview = await fs.readFile(targetPath, 'utf8');
const apply = await handleMessage({ body: applyRequest });
const afterApply = await fs.readFile(targetPath, 'utf8');

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');
const inputAdapter = await fs.readFile('extension/src/content/chat-input-adapter.js', 'utf8');
const deliveryQueue = await fs.readFile('extension/src/delivery-queue.js', 'utf8');
const guardText = buildManualSendGuardText();

const proof = {
  root,
  configPath,
  previewOk: preview.ok,
  previewJobId: preview.job.jobId,
  afterPreview,
  applyRequest,
  applyOk: apply.ok,
  normalizedApplyRequest: apply.request,
  afterApply,
  guardText,
  staticChecks: {
    popupHasManualGuardSection: popupHtml.includes('manual-send-guard'),
    popupStatesManualReviewOnly: popupJs.includes('manual review only'),
    popupStatesNotSubmitted: popupJs.includes('It was NOT submitted'),
    applyBlockHasManualReviewRequired: applyBlock.includes('manualReviewRequired'),
    applyBlockHasSendBehavior: applyBlock.includes(MANUAL_REVIEW_REQUIRED),
    deliveryQueueExportsGuard: deliveryQueue.includes('MANUAL_REVIEW_REQUIRED'),
    contentDoesNotClickSubmit: !/\.click\s*\(/.test(inputAdapter) && !/requestSubmit\s*\(/.test(inputAdapter) && !/submit\s*\(/.test(inputAdapter),
    popupDoesNotClickSubmit: !/requestSubmit\s*\(/.test(popupJs) && !/submit\s*\(/.test(popupJs)
  }
};

console.log(JSON.stringify(proof, null, 2));

if (
  !preview.ok ||
  afterPreview !== 'before manual guard' ||
  applyRequest.manualReviewRequired !== true ||
  applyRequest.sendBehavior !== MANUAL_REVIEW_REQUIRED ||
  applyRequest.sourcePreviewJobId !== preview.job.jobId ||
  !apply.ok ||
  apply.request.manualReviewRequired !== true ||
  apply.request.sendBehavior !== MANUAL_REVIEW_REQUIRED ||
  afterApply !== 'after manual guard' ||
  !guardText.includes('must not submit') ||
  !proof.staticChecks.popupHasManualGuardSection ||
  !proof.staticChecks.popupStatesManualReviewOnly ||
  !proof.staticChecks.popupStatesNotSubmitted ||
  !proof.staticChecks.applyBlockHasManualReviewRequired ||
  !proof.staticChecks.applyBlockHasSendBehavior ||
  !proof.staticChecks.deliveryQueueExportsGuard ||
  !proof.staticChecks.contentDoesNotClickSubmit ||
  !proof.staticChecks.popupDoesNotClickSubmit
) {
  process.exitCode = 1;
}
