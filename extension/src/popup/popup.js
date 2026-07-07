import {
  buildManualSendGuardText,
  buildPreviewApplyHint,
  buildSafeChangeApplyBlock,
  findLatestPreviewQueueItem,
  formatDeliveryQueue,
  formatDeliveryResponse
} from '../delivery-queue.js';
import { buildArtifactOpenPlan, formatArtifactOpenPlan } from '../artifact-open-plan.js';
import { formatArtifactUploadPlan } from '../artifact-upload-plan.js';
import { buildDiffViewerState, formatDiffViewerState } from '../diff-viewer.js';
import {
  buildApplyBlockStateFromRequest,
  buildFinalReviewChecklist,
  formatFinalReviewChecklist
} from '../final-review-checklist.js';
import { buildRoundtripPanelState, formatRoundtripPanelState } from '../roundtrip-proof.js';

const LAST_INSERTION_KEY = 'ultimatebridgeLastApplyInsertion';
const LAST_APPLY_BLOCK_KEY = 'ultimatebridgeLastApplyBlockState';

const status = document.getElementById('status');
const manualSendGuard = document.getElementById('manual-send-guard');
const finalReviewChecklist = document.getElementById('final-review-checklist');
const roundtripStatus = document.getElementById('roundtrip-status');
const diffPreview = document.getElementById('diff-preview');
const artifactOpenPlan = document.getElementById('artifact-open-plan');
const queue = document.getElementById('queue');
const previewApply = document.getElementById('preview-apply');
const safeChangeBlock = document.getElementById('safe-change-block');
const uploadPlan = document.getElementById('upload-plan');
const runSmoke = document.getElementById('run-smoke');
const detectLatest = document.getElementById('detect-latest');
const refreshQueue = document.getElementById('refresh-queue');
const clearQueue = document.getElementById('clear-queue');
const showPreviewApply = document.getElementById('show-preview-apply');
const copyPreviewApply = document.getElementById('copy-preview-apply');
const buildSafeChange = document.getElementById('build-safe-change');
const copySafeChange = document.getElementById('copy-safe-change');
const insertSafeChange = document.getElementById('insert-safe-change');
const showFinalReviewChecklist = document.getElementById('show-final-review-checklist');
const copyFinalReviewChecklist = document.getElementById('copy-final-review-checklist');
const showArtifactOpenPlan = document.getElementById('show-artifact-open-plan');
const copyArtifactOpenPlan = document.getElementById('copy-artifact-open-plan');
const prepareUpload = document.getElementById('prepare-upload');
const copyUploadPlan = document.getElementById('copy-upload-plan');
const clearUploadPlan = document.getElementById('clear-upload-plan');

function writeStatus(value) {
  status.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeManualSendGuard(value = buildManualSendGuardText()) {
  manualSendGuard.textContent = value;
}

function writeFinalReviewChecklist(value) {
  finalReviewChecklist.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeRoundtripStatus(value) {
  roundtripStatus.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeDiffPreview(value) {
  diffPreview.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeArtifactOpenPlan(value) {
  artifactOpenPlan.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeQueue(value) {
  queue.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writePreviewApply(value) {
  previewApply.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeSafeChangeBlock(value) {
  safeChangeBlock.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeUploadPlan(value) {
  uploadPlan.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(response);
    });
  });
}

function getStorageValue(key) {
  return new Promise((resolve) => chrome.storage.local.get(key, (items) => resolve(items?.[key] ?? null)));
}

function setStorageValue(key, value) {
  return new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));
}

function removeStorageValue(key) {
  return new Promise((resolve) => chrome.storage.local.remove(key, resolve));
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function persistApplyBlockState(block) {
  if (!block.trim().startsWith('{')) return null;
  const applyRequest = JSON.parse(block);
  const blockHash = await sha256Hex(block);
  const state = buildApplyBlockStateFromRequest(applyRequest, blockHash);
  await setStorageValue(LAST_APPLY_BLOCK_KEY, { ...state, createdAt: new Date().toISOString() });
  return state;
}

async function updateRoundtripPanel(currentQueue) {
  const insertion = await getStorageValue(LAST_INSERTION_KEY);
  const state = buildRoundtripPanelState(currentQueue, insertion);
  writeRoundtripStatus(formatRoundtripPanelState(state));
  return state;
}

function updateDiffPreview(currentQueue) {
  const state = buildDiffViewerState(currentQueue);
  writeDiffPreview(formatDiffViewerState(state));
  return state;
}

function updateArtifactOpenPlan(currentQueue) {
  const plan = buildArtifactOpenPlan(currentQueue);
  writeArtifactOpenPlan(formatArtifactOpenPlan(plan));
  return plan;
}

async function updateFinalReviewChecklist(currentQueue) {
  const insertion = await getStorageValue(LAST_INSERTION_KEY);
  const applyBlockState = await getStorageValue(LAST_APPLY_BLOCK_KEY);
  const checklist = buildFinalReviewChecklist(currentQueue, insertion, applyBlockState);
  writeFinalReviewChecklist(formatFinalReviewChecklist(checklist));
  return checklist;
}

async function loadQueue() {
  const response = await sendRuntimeMessage({ type: 'ULTIMATEBRIDGE_GET_DELIVERY_QUEUE' });
  if (!response?.ok) {
    writeQueue(response?.error ?? 'Could not load delivery queue.');
    await updateRoundtripPanel([]);
    updateDiffPreview([]);
    updateArtifactOpenPlan([]);
    await updateFinalReviewChecklist([]);
    return [];
  }
  const currentQueue = response.queue ?? [];
  writeQueue(formatDeliveryQueue(currentQueue));
  await updateRoundtripPanel(currentQueue);
  updateDiffPreview(currentQueue);
  updateArtifactOpenPlan(currentQueue);
  await updateFinalReviewChecklist(currentQueue);
  return currentQueue;
}

async function loadUploadPlan() {
  const response = await sendRuntimeMessage({ type: 'ULTIMATEBRIDGE_GET_ARTIFACT_UPLOAD_PLAN' });
  if (!response?.ok) {
    writeUploadPlan(response?.error ?? 'Could not load artifact upload plan.');
    return;
  }
  writeUploadPlan(formatArtifactUploadPlan(response.uploadPlan));
}

async function getLatestPreviewItem() {
  const currentQueue = await loadQueue();
  return findLatestPreviewQueueItem(currentQueue);
}

async function showLatestPreviewApplyRequirement() {
  const previewItem = await getLatestPreviewItem();
  const hint = buildPreviewApplyHint(previewItem);
  writePreviewApply(hint);
  return hint;
}

async function showLatestSafeChangeApplyBlock() {
  const previewItem = await getLatestPreviewItem();
  const block = buildSafeChangeApplyBlock(previewItem);
  writeManualSendGuard();
  writeSafeChangeBlock(block);
  await persistApplyBlockState(block);
  await loadQueue();
  return block;
}

async function showLatestArtifactOpenPlan() {
  const currentQueue = await loadQueue();
  const plan = buildArtifactOpenPlan(currentQueue);
  const text = formatArtifactOpenPlan(plan);
  writeArtifactOpenPlan(text);
  return text;
}

async function showLatestFinalReviewChecklist() {
  const currentQueue = await loadQueue();
  const insertion = await getStorageValue(LAST_INSERTION_KEY);
  const applyBlockState = await getStorageValue(LAST_APPLY_BLOCK_KEY);
  const checklist = buildFinalReviewChecklist(currentQueue, insertion, applyBlockState);
  const text = formatFinalReviewChecklist(checklist);
  writeFinalReviewChecklist(text);
  return text;
}

async function insertLatestSafeChangeApplyBlock() {
  const block = await showLatestSafeChangeApplyBlock();
  if (!block.trim().startsWith('{')) {
    return { ok: false, reason: 'NO_SAFE_CHANGE_BLOCK', message: block };
  }

  const tab = await getActiveTab();
  if (!tab?.id) {
    return { ok: false, reason: 'NO_ACTIVE_TAB' };
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (text) => window.UltimateBridgeSafeInsertText?.(text) ?? { ok: false, reason: 'SAFE_INSERT_FUNCTION_MISSING' },
    args: [block]
  });

  return result?.result ?? { ok: false, reason: 'NO_INJECTION_RESULT' };
}

runSmoke.addEventListener('click', async () => {
  try {
    writeStatus('Running native read-only smoke...');
    const response = await sendRuntimeMessage({ type: 'ULTIMATEBRIDGE_RUN_READONLY_SMOKE' });
    writeStatus(formatDeliveryResponse(response));
    await loadQueue();
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

detectLatest.addEventListener('click', async () => {
  try {
    writeStatus('Running latest bridge block in active tab...');
    const tab = await getActiveTab();
    if (!tab?.id) {
      writeStatus('No active tab found.');
      return;
    }

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.UltimateBridgeDetectLatest?.() ?? { found: false, error: 'content function missing' }
    });

    writeStatus(result?.result ?? result);
    await loadQueue();
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

refreshQueue.addEventListener('click', loadQueue);

clearQueue.addEventListener('click', async () => {
  const response = await sendRuntimeMessage({ type: 'ULTIMATEBRIDGE_CLEAR_DELIVERY_QUEUE' });
  if (response?.ok) {
    await removeStorageValue(LAST_INSERTION_KEY);
    await removeStorageValue(LAST_APPLY_BLOCK_KEY);
    writeQueue('Delivery queue is empty.');
    writePreviewApply('No preview apply requirement available.');
    writeSafeChangeBlock('No SAFE_CHANGE apply block prepared.');
    writeUploadPlan('No artifact upload plan prepared.');
    writeManualSendGuard();
    await updateRoundtripPanel([]);
    updateDiffPreview([]);
    updateArtifactOpenPlan([]);
    await updateFinalReviewChecklist([]);
    writeStatus('Delivery queue cleared.');
  } else {
    writeStatus(response?.error ?? 'Could not clear delivery queue.');
  }
});

showPreviewApply.addEventListener('click', async () => {
  try {
    await showLatestPreviewApplyRequirement();
    writeStatus('Preview apply requirement loaded.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copyPreviewApply.addEventListener('click', async () => {
  try {
    const hint = await showLatestPreviewApplyRequirement();
    await navigator.clipboard.writeText(hint);
    writeStatus('Preview apply requirement copied to clipboard.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

buildSafeChange.addEventListener('click', async () => {
  try {
    await showLatestSafeChangeApplyBlock();
    writeStatus('SAFE_CHANGE apply block prepared for manual review only.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copySafeChange.addEventListener('click', async () => {
  try {
    const block = await showLatestSafeChangeApplyBlock();
    await navigator.clipboard.writeText(block);
    writeStatus('SAFE_CHANGE apply block copied to clipboard for manual review only.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

insertSafeChange.addEventListener('click', async () => {
  try {
    const result = await insertLatestSafeChangeApplyBlock();
    if (result.ok) {
      const insertion = { ok: true, submitted: false, hash: result.hash ?? null, createdAt: new Date().toISOString() };
      await setStorageValue(LAST_INSERTION_KEY, insertion);
      writeManualSendGuard();
      await loadQueue();
      writeStatus(`SAFE_CHANGE apply block inserted into chat input for manual review only. It was NOT submitted.\nhash=${result.hash}`);
    } else {
      writeStatus(`Could not insert SAFE_CHANGE apply block.\nreason=${result.reason ?? 'UNKNOWN'}\n${result.message ?? ''}`);
    }
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

showFinalReviewChecklist.addEventListener('click', async () => {
  try {
    await showLatestFinalReviewChecklist();
    writeStatus('Final review checklist loaded.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copyFinalReviewChecklist.addEventListener('click', async () => {
  try {
    const text = await showLatestFinalReviewChecklist();
    await navigator.clipboard.writeText(text);
    writeStatus('Final review checklist copied to clipboard.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

showArtifactOpenPlan.addEventListener('click', async () => {
  try {
    await showLatestArtifactOpenPlan();
    writeStatus('Artifact open/upload plan loaded.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copyArtifactOpenPlan.addEventListener('click', async () => {
  try {
    const text = await showLatestArtifactOpenPlan();
    await navigator.clipboard.writeText(text);
    writeStatus('Artifact open/upload plan copied to clipboard.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

prepareUpload.addEventListener('click', async () => {
  try {
    const response = await sendRuntimeMessage({ type: 'ULTIMATEBRIDGE_PREPARE_LATEST_ARTIFACT_UPLOAD' });
    if (!response?.ok) {
      writeStatus(response?.error ?? 'Could not prepare artifact upload plan.');
      return;
    }
    writeUploadPlan(formatArtifactUploadPlan(response.uploadPlan));
    writeStatus('Artifact upload plan prepared after user confirmation.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copyUploadPlan.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(uploadPlan.textContent ?? '');
    writeStatus('Artifact upload plan copied to clipboard.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

clearUploadPlan.addEventListener('click', async () => {
  const response = await sendRuntimeMessage({ type: 'ULTIMATEBRIDGE_CLEAR_ARTIFACT_UPLOAD_PLAN' });
  if (response?.ok) {
    writeUploadPlan('No artifact upload plan prepared.');
    writeStatus('Artifact upload plan cleared.');
  } else {
    writeStatus(response?.error ?? 'Could not clear artifact upload plan.');
  }
});

writeManualSendGuard();
loadQueue().catch((error) => writeQueue(`ERROR: ${error.message}`));
loadUploadPlan().catch((error) => writeUploadPlan(`ERROR: ${error.message}`));
