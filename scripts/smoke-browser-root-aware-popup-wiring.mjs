import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import { buildApplyBlockStateFromRequest } from '../extension/src/final-review-checklist.js';
import { buildDeliveryQueueItem, buildSafeChangeApplyBlock, findLatestPreviewQueueItem } from '../extension/src/delivery-queue.js';
import {
  buildRootAwareCommandTemplateLibrary,
  formatRootAwareCommandTemplateLibrary,
  getRootAwareCommandTemplateById
} from '../extension/src/root-aware-command-templates.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'Projekt_024_UltimateBridge-popup-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'root-aware-popup.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before root aware popup', 'utf8');

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'ROOT_AWARE_POPUP_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'RootAwarePopupPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/root-aware-popup.txt', search: 'before', replace: 'after' }
    ]
  }
});
const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const applyBlock = buildSafeChangeApplyBlock(findLatestPreviewQueueItem([previewQueueItem]), {
  requestId: 'ROOT_AWARE_POPUP_APPLY',
  taskName: 'RootAwarePopupApply'
});
const applyRequest = JSON.parse(applyBlock);
const insertion = { ok: true, submitted: false, hash: 'insert-hash' };
const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'block-hash');

const library = buildRootAwareCommandTemplateLibrary([previewQueueItem], insertion, applyBlockState, { storedRoots: [root] });
const text = formatRootAwareCommandTemplateLibrary(library);
const recommended = getRootAwareCommandTemplateById(library, library.nextRecommendedTemplateId);
const parsedRecommended = JSON.parse(recommended.copyText);

const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');
const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');

const result = {
  root,
  configPath,
  afterPreview,
  library: {
    rootAware: library.rootAware,
    selectedLabel: library.selectedLabel,
    selectedRoot: library.selectedRoot,
    nextRecommendedTemplateId: library.nextRecommendedTemplateId
  },
  recommended: {
    id: recommended.id,
    title: recommended.title,
    ready: recommended.ready,
    rootLabel: recommended.rootLabel,
    rootPath: recommended.rootPath,
    parsedProjectLabel: parsedRecommended.projectLabel,
    parsedMode: parsedRecommended.mode,
    parsedSendBehavior: parsedRecommended.sendBehavior
  },
  staticChecks: {
    popupHasCommandTemplatesSection: popupHtml.includes('command-templates'),
    popupImportsRootAwareBuilder: popupJs.includes('buildRootAwareCommandTemplateLibrary'),
    popupImportsRootAwareFormatter: popupJs.includes('formatRootAwareCommandTemplateLibrary'),
    popupImportsRootAwareGetter: popupJs.includes('getRootAwareCommandTemplateById'),
    popupBuildsRootContext: popupJs.includes('buildCommandTemplateRootContext'),
    popupReadsRootMemory: popupJs.includes('PROJECT_ROOT_MEMORY_KEY'),
    popupReadsRootLabels: popupJs.includes('PROJECT_ROOT_LABELS_KEY'),
    popupFormatsRootAwareLibrary: popupJs.includes('formatRootAwareCommandTemplateLibrary(library)'),
    popupCopiesRootAwareRecommended: popupJs.includes('getRootAwareCommandTemplateById'),
    popupStatusMentionsRootAware: popupJs.includes('Root-aware command templates loaded'),
    popupCopyStatusMentionsRootAware: popupJs.includes('root-aware command template copied'),
    textShowsRootAwareHeader: text.includes('ULTIMATEBRIDGE ROOT-AWARE COMMAND TEMPLATE LIBRARY'),
    textShowsSelectedLabel: text.includes(`selectedLabel=${library.selectedLabel}`),
    recommendedHasRootLabel: Boolean(recommended.rootLabel),
    recommendedHasProjectLabel: parsedRecommended.projectLabel === library.selectedLabel,
    recommendedIsSafeChange: parsedRecommended.mode === 'SAFE_CHANGE',
    recommendedManualOnly: parsedRecommended.sendBehavior === 'USER_MUST_REVIEW_AND_SEND_MANUALLY'
  }
};

console.log(JSON.stringify(result, null, 2));
console.log('\n--- ROOT-AWARE POPUP COMMAND TEMPLATES ---\n' + text);

if (
  !previewResponse.ok ||
  afterPreview !== 'before root aware popup' ||
  !library.rootAware ||
  !library.selectedLabel ||
  !recommended.ready ||
  recommended.id !== 'apply-from-latest-preview' ||
  recommended.rootLabel !== library.selectedLabel ||
  parsedRecommended.projectLabel !== library.selectedLabel ||
  parsedRecommended.mode !== 'SAFE_CHANGE' ||
  parsedRecommended.sendBehavior !== 'USER_MUST_REVIEW_AND_SEND_MANUALLY' ||
  !Object.values(result.staticChecks).every(Boolean)
) {
  process.exitCode = 1;
}
