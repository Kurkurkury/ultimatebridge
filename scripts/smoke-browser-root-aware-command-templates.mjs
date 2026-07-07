import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import { buildDeliveryQueueItem, buildSafeChangeApplyBlock, findLatestPreviewQueueItem } from '../extension/src/delivery-queue.js';
import { buildApplyBlockStateFromRequest } from '../extension/src/final-review-checklist.js';
import {
  buildRootAwareCommandTemplateLibrary,
  formatRootAwareCommandTemplateLibrary,
  getRootAwareCommandTemplateById
} from '../extension/src/root-aware-command-templates.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'Projekt_024_UltimateBridge-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'root-aware-templates.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before root aware templates', 'utf8');

const storedLibrary = buildRootAwareCommandTemplateLibrary([], null, null, { storedRoots: [root] });
const storedPreviewTemplate = getRootAwareCommandTemplateById(storedLibrary, 'safe-change-preview-skeleton');
const storedPreviewParsed = JSON.parse(storedPreviewTemplate.copyText);

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'ROOT_AWARE_TEMPLATE_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'RootAwareCommandTemplatePreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/root-aware-templates.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const applyBlock = buildSafeChangeApplyBlock(findLatestPreviewQueueItem([previewQueueItem]), {
  requestId: 'ROOT_AWARE_TEMPLATE_APPLY',
  taskName: 'RootAwareCommandTemplateApply'
});
const applyRequest = JSON.parse(applyBlock);
const insertion = { ok: true, submitted: false, hash: 'insert-hash' };
const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'block-hash');
const queueLibrary = buildRootAwareCommandTemplateLibrary([previewQueueItem], insertion, applyBlockState);
const queueText = formatRootAwareCommandTemplateLibrary(queueLibrary);
const applyTemplate = getRootAwareCommandTemplateById(queueLibrary, 'apply-from-latest-preview');
const applyParsed = JSON.parse(applyTemplate.copyText);

const applyResponse = await handleMessage({ body: applyRequest });
const afterApply = await fs.readFile(targetPath, 'utf8');
const expectedStoredLabel = storedLibrary.selectedLabel;
const expectedQueueLabel = queueLibrary.selectedLabel;

const result = {
  root,
  configPath,
  afterPreview,
  afterApply,
  storedLibrary: {
    rootAware: storedLibrary.rootAware,
    selectedLabel: storedLibrary.selectedLabel,
    selectedRoot: storedLibrary.selectedRoot,
    previewTemplateTitle: storedPreviewTemplate.title,
    previewTemplateRootLabel: storedPreviewTemplate.rootLabel,
    previewTemplateRootPath: storedPreviewTemplate.rootPath,
    parsedProjectLabel: storedPreviewParsed.projectLabel,
    parsedApprovedProjectRoot: storedPreviewParsed.approvedProjectRoot
  },
  queueLibrary: {
    rootAware: queueLibrary.rootAware,
    selectedLabel: queueLibrary.selectedLabel,
    selectedRoot: queueLibrary.selectedRoot,
    nextRecommendedTemplateId: queueLibrary.nextRecommendedTemplateId
  },
  applyTemplate: {
    ready: applyTemplate.ready,
    title: applyTemplate.title,
    rootLabel: applyTemplate.rootLabel,
    rootPath: applyTemplate.rootPath,
    parsedProjectLabel: applyParsed.projectLabel,
    parsedMode: applyParsed.mode,
    parsedSendBehavior: applyParsed.sendBehavior
  },
  staticChecks: {
    textShowsHeader: queueText.includes('ULTIMATEBRIDGE ROOT-AWARE COMMAND TEMPLATE LIBRARY'),
    textShowsRootAware: queueText.includes('rootAware=true'),
    textShowsSelectedLabel: queueText.includes(`selectedLabel=${expectedQueueLabel}`),
    previewUsesRememberedRoot: storedPreviewParsed.approvedProjectRoot === root,
    previewShowsProjectLabel: storedPreviewParsed.projectLabel === expectedStoredLabel,
    applyTemplateManualOnly: applyParsed.sendBehavior === 'USER_MUST_REVIEW_AND_SEND_MANUALLY',
    applyTemplateIsSafeChange: applyParsed.mode === 'SAFE_CHANGE',
    applyTemplateHasProjectLabel: applyParsed.projectLabel === expectedQueueLabel
  }
};

console.log(JSON.stringify(result, null, 2));
console.log('\n--- ROOT AWARE LIBRARY ---\n' + queueText);

if (
  !previewResponse.ok ||
  !applyResponse.ok ||
  afterPreview !== 'before root aware templates' ||
  afterApply !== 'after root aware templates' ||
  !storedLibrary.rootAware ||
  !expectedStoredLabel ||
  storedPreviewParsed.approvedProjectRoot !== root ||
  storedPreviewParsed.projectLabel !== expectedStoredLabel ||
  !queueLibrary.rootAware ||
  !expectedQueueLabel ||
  !applyTemplate.ready ||
  applyParsed.projectLabel !== expectedQueueLabel ||
  applyParsed.mode !== 'SAFE_CHANGE' ||
  applyParsed.sendBehavior !== 'USER_MUST_REVIEW_AND_SEND_MANUALLY' ||
  !Object.values(result.staticChecks).every(Boolean)
) {
  process.exitCode = 1;
}
