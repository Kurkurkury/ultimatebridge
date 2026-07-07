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
import { buildApplyBlockStateFromRequest } from '../extension/src/final-review-checklist.js';
import { buildBrowserSessionSummary, formatBrowserSessionSummary } from '../extension/src/session-summary.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-session-summary-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'session-summary.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before session summary', 'utf8');

const emptySummary = buildBrowserSessionSummary([], null, null);
const emptyText = formatBrowserSessionSummary(emptySummary);

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'SESSION_SUMMARY_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'BrowserSessionSummaryPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/session-summary.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const applyBlock = buildSafeChangeApplyBlock(findLatestPreviewQueueItem([previewQueueItem]), {
  requestId: 'SESSION_SUMMARY_APPLY',
  taskName: 'BrowserSessionSummaryApply'
});
const applyRequest = JSON.parse(applyBlock);
const insertion = {
  ok: true,
  submitted: false,
  hash: sha256Hex(applyBlock)
};
const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, sha256Hex(applyBlock));
const beforeApplySummary = buildBrowserSessionSummary([previewQueueItem], insertion, applyBlockState);
const beforeApplyText = formatBrowserSessionSummary(beforeApplySummary);

const applyResponse = await handleMessage({ body: applyRequest });
const afterApply = await fs.readFile(targetPath, 'utf8');
const applyQueueItem = buildDeliveryQueueItem(applyResponse, '2026-01-01T00:00:01.000Z');
const afterApplySummary = buildBrowserSessionSummary([applyQueueItem, previewQueueItem], insertion, applyBlockState);
const afterApplyText = formatBrowserSessionSummary(afterApplySummary);

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');

const result = {
  root,
  configPath,
  afterPreview,
  afterApply,
  emptySummary,
  emptyText,
  previewJobId: previewQueueItem.jobId,
  applyJobId: applyQueueItem.jobId,
  beforeApplySummary,
  beforeApplyText,
  afterApplySummary,
  afterApplyText,
  staticChecks: {
    popupHasSessionSummarySection: popupHtml.includes('session-summary'),
    popupHasShowButton: popupHtml.includes('show-session-summary'),
    popupHasCopyButton: popupHtml.includes('copy-session-summary'),
    popupImportsSessionSummary: popupJs.includes('formatBrowserSessionSummary'),
    popupUpdatesSummaryOnQueueLoad: popupJs.includes('updateSessionSummary(currentQueue)'),
    popupClearsSummaryOnQueueClear: popupJs.includes('updateSessionSummary([])'),
    summaryShowsHeader: afterApplyText.includes('ULTIMATEBRIDGE SESSION SUMMARY'),
    summaryShowsReadyToApply: beforeApplyText.includes('readyToApply=true'),
    summaryShowsReadyToComplete: afterApplyText.includes('readyToComplete=true'),
    summaryShowsProjectRoot: beforeApplyText.includes('latestProjectRoot='),
    summaryShowsNextAction: afterApplyText.includes('nextAction='),
    summaryShowsChatGptNextMessage: afterApplyText.includes('chatgptNextMessage='),
    summaryShowsRecentJobs: afterApplyText.includes('recentJobs:')
  }
};

console.log(JSON.stringify(result, null, 2));
console.log('\n--- EMPTY ---\n' + emptyText);
console.log('\n--- BEFORE APPLY ---\n' + beforeApplyText);
console.log('\n--- AFTER APPLY ---\n' + afterApplyText);

if (
  !previewResponse.ok ||
  !applyResponse.ok ||
  afterPreview !== 'before session summary' ||
  afterApply !== 'after session summary' ||
  emptySummary.available !== false ||
  !beforeApplySummary.readyToApply ||
  beforeApplySummary.readyToComplete ||
  !beforeApplySummary.chatgptNextMessage.includes('Manually send') ||
  !afterApplySummary.readyToApply ||
  !afterApplySummary.readyToComplete ||
  !afterApplySummary.chatgptNextMessage.includes('complete') ||
  !result.staticChecks.popupHasSessionSummarySection ||
  !result.staticChecks.popupHasShowButton ||
  !result.staticChecks.popupHasCopyButton ||
  !result.staticChecks.popupImportsSessionSummary ||
  !result.staticChecks.popupUpdatesSummaryOnQueueLoad ||
  !result.staticChecks.popupClearsSummaryOnQueueClear ||
  !result.staticChecks.summaryShowsHeader ||
  !result.staticChecks.summaryShowsReadyToApply ||
  !result.staticChecks.summaryShowsReadyToComplete ||
  !result.staticChecks.summaryShowsProjectRoot ||
  !result.staticChecks.summaryShowsNextAction ||
  !result.staticChecks.summaryShowsChatGptNextMessage ||
  !result.staticChecks.summaryShowsRecentJobs
) {
  process.exitCode = 1;
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}
