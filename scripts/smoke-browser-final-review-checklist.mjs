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
  buildApplyBlockStateFromRequest,
  buildFinalReviewChecklist,
  formatFinalReviewChecklist
} from '../extension/src/final-review-checklist.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-final-review-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'final-review.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before final review', 'utf8');

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'FINAL_REVIEW_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'BrowserFinalReviewPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/final-review.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const applyBlock = buildSafeChangeApplyBlock(findLatestPreviewQueueItem([previewQueueItem]), {
  requestId: 'FINAL_REVIEW_APPLY',
  taskName: 'BrowserFinalReviewApply'
});
const applyRequest = JSON.parse(applyBlock);
const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, sha256Hex(applyBlock));
const insertion = {
  ok: true,
  submitted: false,
  hash: sha256Hex(applyBlock)
};
const beforeApplyChecklist = buildFinalReviewChecklist([previewQueueItem], insertion, applyBlockState);
const beforeApplyText = formatFinalReviewChecklist(beforeApplyChecklist);

const applyResponse = await handleMessage({ body: applyRequest });
const afterApply = await fs.readFile(targetPath, 'utf8');
const applyQueueItem = buildDeliveryQueueItem(applyResponse, '2026-01-01T00:00:01.000Z');
const afterApplyChecklist = buildFinalReviewChecklist([applyQueueItem, previewQueueItem], insertion, applyBlockState);
const afterApplyText = formatFinalReviewChecklist(afterApplyChecklist);

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');

const result = {
  root,
  configPath,
  afterPreview,
  afterApply,
  previewJobId: previewQueueItem.jobId,
  applyJobId: applyQueueItem.jobId,
  applyBlockState,
  insertion,
  beforeApplyChecklist,
  beforeApplyText,
  afterApplyChecklist,
  afterApplyText,
  staticChecks: {
    popupHasFinalReviewSection: popupHtml.includes('final-review-checklist'),
    popupHasShowButton: popupHtml.includes('show-final-review-checklist'),
    popupHasCopyButton: popupHtml.includes('copy-final-review-checklist'),
    popupImportsFinalReview: popupJs.includes('formatFinalReviewChecklist'),
    popupPersistsApplyBlockState: popupJs.includes('ultimatebridgeLastApplyBlockState'),
    popupUpdatesChecklistOnQueueLoad: popupJs.includes('updateFinalReviewChecklist(currentQueue)'),
    popupClearsChecklistOnQueueClear: popupJs.includes('updateFinalReviewChecklist([])'),
    checklistShowsReadyToApply: beforeApplyText.includes('readyToApply=true'),
    checklistShowsNotReadyToCompleteBeforeApply: beforeApplyText.includes('readyToComplete=false'),
    checklistShowsReadyToComplete: afterApplyText.includes('readyToComplete=true'),
    checklistShowsRollback: afterApplyText.includes('[x] rollbackPlanAvailable') && afterApplyText.includes('[x] rollbackRestoreCommandAvailable'),
    checklistShowsNoAutoSubmit: afterApplyText.includes('[x] notAutoSubmitted')
  }
};

console.log(JSON.stringify(result, null, 2));
console.log('\n--- BEFORE APPLY ---\n' + beforeApplyText);
console.log('\n--- AFTER APPLY ---\n' + afterApplyText);

if (
  !previewResponse.ok ||
  !applyResponse.ok ||
  afterPreview !== 'before final review' ||
  afterApply !== 'after final review' ||
  !beforeApplyChecklist.readyToApply ||
  beforeApplyChecklist.readyToComplete ||
  !afterApplyChecklist.readyToApply ||
  !afterApplyChecklist.readyToComplete ||
  !afterApplyChecklist.checks.every((item) => item.ok) ||
  !result.staticChecks.popupHasFinalReviewSection ||
  !result.staticChecks.popupHasShowButton ||
  !result.staticChecks.popupHasCopyButton ||
  !result.staticChecks.popupImportsFinalReview ||
  !result.staticChecks.popupPersistsApplyBlockState ||
  !result.staticChecks.popupUpdatesChecklistOnQueueLoad ||
  !result.staticChecks.popupClearsChecklistOnQueueClear ||
  !result.staticChecks.checklistShowsReadyToApply ||
  !result.staticChecks.checklistShowsNotReadyToCompleteBeforeApply ||
  !result.staticChecks.checklistShowsReadyToComplete ||
  !result.staticChecks.checklistShowsRollback ||
  !result.staticChecks.checklistShowsNoAutoSubmit
) {
  process.exitCode = 1;
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}
