import {
  buildPreviewApplyHint,
  buildSafeChangeApplyBlock,
  findLatestPreviewQueueItem,
  formatDeliveryQueue,
  formatDeliveryResponse
} from '../delivery-queue.js';
import { formatArtifactUploadPlan } from '../artifact-upload-plan.js';

const status = document.getElementById('status');
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
const prepareUpload = document.getElementById('prepare-upload');
const copyUploadPlan = document.getElementById('copy-upload-plan');
const clearUploadPlan = document.getElementById('clear-upload-plan');

function writeStatus(value) {
  status.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
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

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadQueue() {
  const response = await sendRuntimeMessage({ type: 'ULTIMATEBRIDGE_GET_DELIVERY_QUEUE' });
  if (!response?.ok) {
    writeQueue(response?.error ?? 'Could not load delivery queue.');
    return [];
  }
  writeQueue(formatDeliveryQueue(response.queue));
  return response.queue ?? [];
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
  writeSafeChangeBlock(block);
  return block;
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
    writeQueue('Delivery queue is empty.');
    writePreviewApply('No preview apply requirement available.');
    writeSafeChangeBlock('No SAFE_CHANGE apply block prepared.');
    writeUploadPlan('No artifact upload plan prepared.');
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
    writeStatus('SAFE_CHANGE apply block prepared.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copySafeChange.addEventListener('click', async () => {
  try {
    const block = await showLatestSafeChangeApplyBlock();
    await navigator.clipboard.writeText(block);
    writeStatus('SAFE_CHANGE apply block copied to clipboard.');
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

loadQueue().catch((error) => writeQueue(`ERROR: ${error.message}`));
loadUploadPlan().catch((error) => writeUploadPlan(`ERROR: ${error.message}`));
