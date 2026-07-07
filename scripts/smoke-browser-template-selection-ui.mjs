import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import { buildApplyBlockStateFromRequest } from '../extension/src/final-review-checklist.js';
import { buildDeliveryQueueItem, buildSafeChangeApplyBlock, findLatestPreviewQueueItem } from '../extension/src/delivery-queue.js';
import { buildRootAwareCommandTemplateLibrary, getRootAwareCommandTemplateById } from '../extension/src/root-aware-command-templates.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'Projekt_024_TemplateSelection-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'template-selection.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before template selection', 'utf8');

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'TEMPLATE_SELECTION_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'TemplateSelectionPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/template-selection.txt', search: 'before', replace: 'after' }
    ]
  }
});
const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const applyBlock = buildSafeChangeApplyBlock(findLatestPreviewQueueItem([previewQueueItem]), {
  requestId: 'TEMPLATE_SELECTION_APPLY',
  taskName: 'TemplateSelectionApply'
});
const applyRequest = JSON.parse(applyBlock);
const applyBlockState = buildApplyBlockStateFromRequest(applyRequest, 'block-hash');
const library = buildRootAwareCommandTemplateLibrary([previewQueueItem], { ok: true, submitted: false, hash: 'insert-hash' }, applyBlockState, { storedRoots: [root] });

const selectedIds = [
  'read-only-healthcheck',
  'safe-change-preview-skeleton',
  'apply-from-latest-preview',
  'rollback-restore-review',
  'artifact-checklist',
  'session-summary',
  'final-review-checklist'
];
const selectedTemplates = selectedIds.map((id) => getRootAwareCommandTemplateById(library, id));
const selectedApply = getRootAwareCommandTemplateById(library, 'apply-from-latest-preview');
const selectedPreview = getRootAwareCommandTemplateById(library, 'safe-change-preview-skeleton');
const parsedApply = JSON.parse(selectedApply.copyText);
const parsedPreview = JSON.parse(selectedPreview.copyText);

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');

const result = {
  root,
  configPath,
  afterPreview,
  library: {
    rootAware: library.rootAware,
    selectedLabel: library.selectedLabel,
    selectedRoot: library.selectedRoot,
    templateCount: library.templateCount,
    nextRecommendedTemplateId: library.nextRecommendedTemplateId
  },
  selectedIds,
  selectedTemplates: selectedTemplates.map((template) => ({
    id: template?.id,
    ready: template?.ready,
    rootLabel: template?.rootLabel ?? null,
    hasCopyText: Boolean(template?.copyText)
  })),
  selectedApply: {
    ready: selectedApply.ready,
    rootLabel: selectedApply.rootLabel,
    parsedProjectLabel: parsedApply.projectLabel,
    parsedMode: parsedApply.mode,
    parsedSendBehavior: parsedApply.sendBehavior
  },
  selectedPreview: {
    rootLabel: selectedPreview.rootLabel,
    parsedProjectLabel: parsedPreview.projectLabel,
    parsedMode: parsedPreview.mode,
    parsedApprovedProjectRoot: parsedPreview.approvedProjectRoot
  },
  staticChecks: {
    htmlHasTemplateSelect: popupHtml.includes('command-template-select'),
    htmlHasCopySelectedButton: popupHtml.includes('copy-selected-command-template'),
    htmlHasAllTemplateOptions: selectedIds.every((id) => popupHtml.includes(`value="${id}"`)),
    jsReadsTemplateSelect: popupJs.includes('commandTemplateSelect'),
    jsReadsCopySelectedButton: popupJs.includes('copySelectedCommandTemplate'),
    jsHasCopyByIdHelper: popupJs.includes('copyCommandTemplateById'),
    jsUsesSelectedValue: popupJs.includes('commandTemplateSelect.value'),
    jsUsesRootAwareGetter: popupJs.includes('getRootAwareCommandTemplateById'),
    jsStatusMentionsSelected: popupJs.includes('${copyKind} root-aware command template copied') || popupJs.includes('root-aware command template copied'),
    jsDoesNotAutoSubmitSelected: !popupJs.includes('copySelectedCommandTemplate.click()'),
    selectedTemplatesAllFound: selectedTemplates.every(Boolean),
    selectedTemplatesAllCopyable: selectedTemplates.every((template) => Boolean(template?.copyText)),
    selectedPreviewUsesRoot: parsedPreview.approvedProjectRoot === root,
    selectedPreviewHasProjectLabel: parsedPreview.projectLabel === library.selectedLabel,
    selectedApplyIsSafeChange: parsedApply.mode === 'SAFE_CHANGE',
    selectedApplyManualOnly: parsedApply.sendBehavior === 'USER_MUST_REVIEW_AND_SEND_MANUALLY',
    selectedApplyHasProjectLabel: parsedApply.projectLabel === library.selectedLabel
  }
};

console.log(JSON.stringify(result, null, 2));

if (
  !previewResponse.ok ||
  afterPreview !== 'before template selection' ||
  !library.rootAware ||
  !library.selectedLabel ||
  library.templateCount !== 7 ||
  selectedTemplates.length !== 7 ||
  !Object.values(result.staticChecks).every(Boolean)
) {
  process.exitCode = 1;
}
