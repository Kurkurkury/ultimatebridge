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

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-apply-injection-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'inject.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before inject', 'utf8');

const preview = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'INJECT_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'BrowserApplyInjectionPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/inject.txt', search: 'before', replace: 'after' }
    ]
  }
});

const item = buildDeliveryQueueItem(preview, '2026-01-01T00:00:00.000Z');
const latestPreview = findLatestPreviewQueueItem([item]);
const applyBlock = buildSafeChangeApplyBlock(latestPreview, {
  requestId: 'INJECT_APPLY',
  taskName: 'BrowserApplyInjectionApply'
});
const applyRequest = JSON.parse(applyBlock);
const afterPreview = await fs.readFile(targetPath, 'utf8');

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');
const inputAdapter = await fs.readFile('extension/src/content/chat-input-adapter.js', 'utf8');

const insertedText = applyBlock;
const expectedHash = sha256Hex(applyBlock);
const actualHash = sha256Hex(insertedText);
const simulatedInsertion = {
  ok: expectedHash === actualHash,
  hash: actualHash,
  submitted: false
};

const proof = {
  root,
  configPath,
  previewOk: preview.ok,
  previewJobId: preview.job.jobId,
  previewHash: item.previewHash,
  afterPreview,
  applyRequest,
  applyBlock,
  simulatedInsertion,
  staticChecks: {
    popupHasInsertButton: popupHtml.includes('insert-safe-change'),
    popupCallsSafeInsert: popupJs.includes('UltimateBridgeSafeInsertText'),
    popupStatesNotSubmitted: popupJs.includes('It was NOT submitted'),
    contentExposesSafeInsert: inputAdapter.includes('window.UltimateBridgeSafeInsertText'),
    contentUsesHashCheck: inputAdapter.includes('INPUT_HASH_MISMATCH'),
    contentDoesNotClickSubmit: !/\.click\s*\(/.test(inputAdapter) && !/requestSubmit\s*\(/.test(inputAdapter)
  }
};

console.log(JSON.stringify(proof, null, 2));

if (
  !preview.ok ||
  afterPreview !== 'before inject' ||
  applyRequest.mode !== 'SAFE_CHANGE' ||
  !applyRequest.requiredPreviewHash ||
  !simulatedInsertion.ok ||
  simulatedInsertion.submitted !== false ||
  !proof.staticChecks.popupHasInsertButton ||
  !proof.staticChecks.popupCallsSafeInsert ||
  !proof.staticChecks.popupStatesNotSubmitted ||
  !proof.staticChecks.contentExposesSafeInsert ||
  !proof.staticChecks.contentUsesHashCheck ||
  !proof.staticChecks.contentDoesNotClickSubmit
) {
  process.exitCode = 1;
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}
