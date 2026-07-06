import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import { buildDeliveryQueueItem } from '../extension/src/delivery-queue.js';
import { buildDiffViewerState, formatDiffViewerState } from '../extension/src/diff-viewer.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-diff-viewer-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'diff.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before diff viewer', 'utf8');

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'DIFF_VIEWER_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'BrowserDiffViewerPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/diff.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const diffState = buildDiffViewerState([previewQueueItem]);
const formattedDiff = formatDiffViewerState(diffState);

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');

const result = {
  root,
  configPath,
  afterPreview,
  previewQueueItem,
  diffState,
  formattedDiff,
  staticChecks: {
    popupHasDiffPreviewSection: popupHtml.includes('diff-preview'),
    popupImportsDiffViewer: popupJs.includes('formatDiffViewerState'),
    popupUpdatesDiffOnQueueLoad: popupJs.includes('updateDiffPreview(currentQueue)'),
    popupClearsDiffOnQueueClear: popupJs.includes('updateDiffPreview([])'),
    diffShowsHeader: formattedDiff.includes('ULTIMATEBRIDGE DIFF PREVIEW'),
    diffShowsPreviewHash: formattedDiff.includes('previewHash='),
    diffShowsDiffPath: formattedDiff.includes('previewDiffPath='),
    diffShowsChangeCount: formattedDiff.includes('changeCount=1'),
    diffShowsOperation: formattedDiff.includes('change[0] op=replaceText'),
    diffShowsPath: formattedDiff.includes('path=notes/diff.txt'),
    diffShowsSearchReplace: formattedDiff.includes('search=before') && formattedDiff.includes('replace=after')
  }
};

console.log(JSON.stringify(result, null, 2));
console.log('\n' + formattedDiff);

if (
  !previewResponse.ok ||
  afterPreview !== 'before diff viewer' ||
  !diffState.available ||
  diffState.changeCount !== 1 ||
  diffState.changes[0].op !== 'replaceText' ||
  diffState.changes[0].path !== 'notes/diff.txt' ||
  diffState.changes[0].searchPreview !== 'before' ||
  diffState.changes[0].replacePreview !== 'after' ||
  !result.staticChecks.popupHasDiffPreviewSection ||
  !result.staticChecks.popupImportsDiffViewer ||
  !result.staticChecks.popupUpdatesDiffOnQueueLoad ||
  !result.staticChecks.popupClearsDiffOnQueueClear ||
  !result.staticChecks.diffShowsHeader ||
  !result.staticChecks.diffShowsPreviewHash ||
  !result.staticChecks.diffShowsDiffPath ||
  !result.staticChecks.diffShowsChangeCount ||
  !result.staticChecks.diffShowsOperation ||
  !result.staticChecks.diffShowsPath ||
  !result.staticChecks.diffShowsSearchReplace
) {
  process.exitCode = 1;
}
