import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import { buildDeliveryQueueItem } from '../extension/src/delivery-queue.js';
import {
  buildPreviewTemplateFromProjectRootMemory,
  buildProjectRootMemory,
  formatProjectRootMemory,
  mergeProjectRootMemory
} from '../extension/src/project-root-memory.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-root-memory-'));
const oldRoot = path.join(os.tmpdir(), 'ultimatebridge-root-memory-old');
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'root-memory.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before root memory', 'utf8');

const emptyMemory = buildProjectRootMemory([], []);
const emptyText = formatProjectRootMemory(emptyMemory);

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'ROOT_MEMORY_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'BrowserProjectRootMemoryPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/root-memory.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const mergedRoots = mergeProjectRootMemory([previewQueueItem], [oldRoot, `${root}\\`]);
const memory = buildProjectRootMemory([], mergedRoots);
const memoryText = formatProjectRootMemory(memory);
const template = buildPreviewTemplateFromProjectRootMemory(memory);
const parsedTemplate = JSON.parse(template);

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');

const result = {
  root,
  oldRoot,
  configPath,
  afterPreview,
  emptyMemory,
  emptyText,
  previewJobId: previewQueueItem.jobId,
  mergedRoots,
  memory,
  memoryText,
  template,
  parsedTemplate,
  staticChecks: {
    popupHasProjectRootMemorySection: popupHtml.includes('project-root-memory'),
    popupHasShowButton: popupHtml.includes('show-project-root-memory'),
    popupHasCopyTemplateButton: popupHtml.includes('copy-preview-template-from-root-memory'),
    popupHasClearButton: popupHtml.includes('clear-project-root-memory'),
    popupImportsProjectRootMemory: popupJs.includes('formatProjectRootMemory'),
    popupStoresProjectRootMemory: popupJs.includes('ultimatebridgeProjectRootMemory'),
    popupUpdatesMemoryOnQueueLoad: popupJs.includes('updateProjectRootMemory(currentQueue)'),
    popupKeepsMemoryOnQueueClear: popupJs.includes('Project root memory was kept'),
    popupCopiesPreviewTemplate: popupJs.includes('buildPreviewTemplateFromProjectRootMemory'),
    memoryShowsHeader: memoryText.includes('ULTIMATEBRIDGE PROJECT ROOT MEMORY'),
    memoryShowsSelectedRoot: memoryText.includes(`selectedRoot=${root}`),
    memoryShowsRootCount: memoryText.includes('rootCount=2'),
    templateUsesRememberedRoot: parsedTemplate.approvedProjectRoot === root,
    templateIsPreview: parsedTemplate.mode === 'SAFE_CHANGE_PREVIEW'
  }
};

console.log(JSON.stringify(result, null, 2));
console.log('\n--- EMPTY ---\n' + emptyText);
console.log('\n--- MEMORY ---\n' + memoryText);
console.log('\n--- TEMPLATE ---\n' + template);

if (
  !previewResponse.ok ||
  afterPreview !== 'before root memory' ||
  emptyMemory.available !== false ||
  !memory.available ||
  memory.rootCount !== 2 ||
  memory.selectedRoot !== root ||
  mergedRoots[0] !== root ||
  !mergedRoots.includes(oldRoot) ||
  parsedTemplate.mode !== 'SAFE_CHANGE_PREVIEW' ||
  parsedTemplate.approvedProjectRoot !== root ||
  !result.staticChecks.popupHasProjectRootMemorySection ||
  !result.staticChecks.popupHasShowButton ||
  !result.staticChecks.popupHasCopyTemplateButton ||
  !result.staticChecks.popupHasClearButton ||
  !result.staticChecks.popupImportsProjectRootMemory ||
  !result.staticChecks.popupStoresProjectRootMemory ||
  !result.staticChecks.popupUpdatesMemoryOnQueueLoad ||
  !result.staticChecks.popupKeepsMemoryOnQueueClear ||
  !result.staticChecks.popupCopiesPreviewTemplate ||
  !result.staticChecks.memoryShowsHeader ||
  !result.staticChecks.memoryShowsSelectedRoot ||
  !result.staticChecks.memoryShowsRootCount ||
  !result.staticChecks.templateUsesRememberedRoot ||
  !result.staticChecks.templateIsPreview
) {
  process.exitCode = 1;
}
