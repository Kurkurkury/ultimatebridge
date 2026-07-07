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
  buildCommandTemplateLibrary,
  formatCommandTemplateLibrary,
  getCommandTemplateById
} from '../extension/src/command-templates.js';
import { buildApplyBlockStateFromRequest } from '../extension/src/final-review-checklist.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-command-templates-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'templates.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before command templates', 'utf8');

const emptyLibrary = buildCommandTemplateLibrary([], null, null);
const emptyText = formatCommandTemplateLibrary(emptyLibrary);

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'COMMAND_TEMPLATE_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'BrowserCommandTemplatePreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/templates.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const applyBlock = buildSafeChangeApplyBlock(findLatestPreviewQueueItem([previewQueueItem]), {
  requestId: 'COMMAND_TEMPLATE_APPLY',
  taskName: 'BrowserCommandTemplateApply'
});
const applyRequest = JSON.parse(applyBlock);
const insertion = {
  ok: true,
  submitted: false,
  hash: sha256Hex(applyBlock)
};
const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, sha256Hex(applyBlock));
const beforeApplyLibrary = buildCommandTemplateLibrary([previewQueueItem], insertion, applyBlockState);
const beforeApplyText = formatCommandTemplateLibrary(beforeApplyLibrary);
const recommendedBefore = getCommandTemplateById(beforeApplyLibrary, beforeApplyLibrary.nextRecommendedTemplateId);

const applyResponse = await handleMessage({ body: applyRequest });
const afterApply = await fs.readFile(targetPath, 'utf8');
const applyQueueItem = buildDeliveryQueueItem(applyResponse, '2026-01-01T00:00:01.000Z');
const afterApplyLibrary = buildCommandTemplateLibrary([applyQueueItem, previewQueueItem], insertion, applyBlockState);
const afterApplyText = formatCommandTemplateLibrary(afterApplyLibrary);
const recommendedAfter = getCommandTemplateById(afterApplyLibrary, afterApplyLibrary.nextRecommendedTemplateId);

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');

const applyTemplate = getCommandTemplateById(beforeApplyLibrary, 'apply-from-latest-preview');
const rollbackTemplate = getCommandTemplateById(afterApplyLibrary, 'rollback-restore-review');
const result = {
  root,
  configPath,
  afterPreview,
  afterApply,
  emptyLibrary,
  emptyText,
  beforeApplyLibrary,
  beforeApplyText,
  afterApplyLibrary,
  afterApplyText,
  recommendedBefore,
  recommendedAfter,
  applyTemplate,
  rollbackTemplate,
  staticChecks: {
    popupHasCommandTemplatesSection: popupHtml.includes('command-templates'),
    popupHasShowButton: popupHtml.includes('show-command-templates'),
    popupHasCopyRecommendedButton: popupHtml.includes('copy-recommended-command-template'),
    popupImportsCommandTemplates: popupJs.includes('formatCommandTemplateLibrary'),
    popupUpdatesTemplatesOnQueueLoad: popupJs.includes('updateCommandTemplates(currentQueue)'),
    popupClearsTemplatesOnQueueClear: popupJs.includes('updateCommandTemplates([])'),
    libraryShowsHeader: afterApplyText.includes('ULTIMATEBRIDGE COMMAND TEMPLATE LIBRARY'),
    libraryShowsReadOnly: afterApplyText.includes('id=read-only-healthcheck'),
    libraryShowsPreviewSkeleton: afterApplyText.includes('id=safe-change-preview-skeleton'),
    libraryShowsApplyFromPreview: afterApplyText.includes('id=apply-from-latest-preview'),
    libraryShowsRollback: afterApplyText.includes('id=rollback-restore-review'),
    libraryShowsArtifactChecklist: afterApplyText.includes('id=artifact-checklist'),
    libraryShowsSessionSummary: afterApplyText.includes('id=session-summary'),
    libraryShowsManualBoundary: afterApplyText.includes('copy-only; user must review and send manually'),
    applyTemplateIsSafeChange: applyTemplate.copyText.includes('"mode": "SAFE_CHANGE"'),
    applyTemplateManualOnly: applyTemplate.copyText.includes('USER_MUST_REVIEW_AND_SEND_MANUALLY'),
    recommendedBeforeApply: beforeApplyLibrary.nextRecommendedTemplateId === 'apply-from-latest-preview',
    recommendedAfterComplete: afterApplyLibrary.nextRecommendedTemplateId === 'session-summary'
  }
};

console.log(JSON.stringify(result, null, 2));
console.log('\n--- EMPTY ---\n' + emptyText);
console.log('\n--- BEFORE APPLY ---\n' + beforeApplyText);
console.log('\n--- AFTER APPLY ---\n' + afterApplyText);

if (
  !previewResponse.ok ||
  !applyResponse.ok ||
  afterPreview !== 'before command templates' ||
  afterApply !== 'after command templates' ||
  emptyLibrary.templateCount !== 7 ||
  beforeApplyLibrary.templateCount !== 7 ||
  afterApplyLibrary.templateCount !== 7 ||
  beforeApplyLibrary.nextRecommendedTemplateId !== 'apply-from-latest-preview' ||
  afterApplyLibrary.nextRecommendedTemplateId !== 'session-summary' ||
  !applyTemplate.ready ||
  !rollbackTemplate.ready ||
  !result.staticChecks.popupHasCommandTemplatesSection ||
  !result.staticChecks.popupHasShowButton ||
  !result.staticChecks.popupHasCopyRecommendedButton ||
  !result.staticChecks.popupImportsCommandTemplates ||
  !result.staticChecks.popupUpdatesTemplatesOnQueueLoad ||
  !result.staticChecks.popupClearsTemplatesOnQueueClear ||
  !result.staticChecks.libraryShowsHeader ||
  !result.staticChecks.libraryShowsReadOnly ||
  !result.staticChecks.libraryShowsPreviewSkeleton ||
  !result.staticChecks.libraryShowsApplyFromPreview ||
  !result.staticChecks.libraryShowsRollback ||
  !result.staticChecks.libraryShowsArtifactChecklist ||
  !result.staticChecks.libraryShowsSessionSummary ||
  !result.staticChecks.libraryShowsManualBoundary ||
  !result.staticChecks.applyTemplateIsSafeChange ||
  !result.staticChecks.applyTemplateManualOnly ||
  !result.staticChecks.recommendedBeforeApply ||
  !result.staticChecks.recommendedAfterComplete
) {
  process.exitCode = 1;
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}
