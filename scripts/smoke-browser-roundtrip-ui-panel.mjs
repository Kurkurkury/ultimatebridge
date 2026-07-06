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
import { buildRoundtripPanelState, formatRoundtripPanelState } from '../extension/src/roundtrip-proof.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-roundtrip-panel-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'panel.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before panel', 'utf8');

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'PANEL_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'BrowserRoundtripPanelPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/panel.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const applyBlock = buildSafeChangeApplyBlock(findLatestPreviewQueueItem([previewQueueItem]), {
  requestId: 'PANEL_APPLY',
  taskName: 'BrowserRoundtripPanelApply'
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
const panelState = buildRoundtripPanelState([applyQueueItem, previewQueueItem], insertion);
const formattedPanel = formatRoundtripPanelState(panelState);

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');

const result = {
  root,
  configPath,
  afterPreview,
  afterApply,
  previewQueueItem,
  applyRequest,
  insertion,
  applyQueueItem,
  panelState,
  formattedPanel,
  staticChecks: {
    popupHasRoundtripPanel: popupHtml.includes('roundtrip-status'),
    popupImportsRoundtripPanel: popupJs.includes('formatRoundtripPanelState'),
    popupPersistsInsertion: popupJs.includes('ultimatebridgeLastApplyInsertion'),
    popupUpdatesPanelOnQueueLoad: popupJs.includes('updateRoundtripPanel(currentQueue)'),
    panelShowsAllOk: formattedPanel.includes('allOk=true'),
    panelShowsApplyHash: formattedPanel.includes('applyHash='),
    panelShowsInsertStatus: formattedPanel.includes('insertOk=true') && formattedPanel.includes('submitted=false'),
    panelShowsApplyStatus: formattedPanel.includes('applyStatus=OK'),
    panelShowsHashMatch: formattedPanel.includes('previewHashMatched=true')
  }
};

console.log(JSON.stringify(result, null, 2));
console.log('\n' + formattedPanel);

if (
  afterPreview !== 'before panel' ||
  afterApply !== 'after panel' ||
  !panelState.allOk ||
  panelState.previewHashMatched !== true ||
  panelState.insertOk !== true ||
  panelState.submitted !== false ||
  panelState.applyStatus !== 'OK' ||
  !result.staticChecks.popupHasRoundtripPanel ||
  !result.staticChecks.popupImportsRoundtripPanel ||
  !result.staticChecks.popupPersistsInsertion ||
  !result.staticChecks.popupUpdatesPanelOnQueueLoad ||
  !result.staticChecks.panelShowsAllOk ||
  !result.staticChecks.panelShowsApplyHash ||
  !result.staticChecks.panelShowsInsertStatus ||
  !result.staticChecks.panelShowsApplyStatus ||
  !result.staticChecks.panelShowsHashMatch
) {
  process.exitCode = 1;
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}
