import { formatBrowserNativeConnectionDiagnostics } from '../connection-diagnostics.js';
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
import {
  buildPreviewTemplateFromProjectRootMemory,
  buildProjectRootMemory,
  formatProjectRootMemory,
  mergeProjectRootMemory
} from '../project-root-memory.js';
import { buildProjectRootLabelMap, buildProjectRootLabels, formatProjectRootLabels } from '../project-root-labels.js';
import {
  buildRootAwareCommandTemplateLibrary,
  formatRootAwareCommandTemplateLibrary,
  getRootAwareCommandTemplateById
} from '../root-aware-command-templates.js';
import { buildRoundtripPanelState, formatRoundtripPanelState } from '../roundtrip-proof.js';
import { buildBrowserSessionSummary, formatBrowserSessionSummary } from '../session-summary.js';

const LAST_INSERTION_KEY = 'ultimatebridgeLastApplyInsertion';
const LAST_APPLY_BLOCK_KEY = 'ultimatebridgeLastApplyBlockState';
const PROJECT_ROOT_MEMORY_KEY = 'ultimatebridgeProjectRootMemory';
const PROJECT_ROOT_LABELS_KEY = 'ultimatebridgeProjectRootLabels';

const status = document.getElementById('status');
const connectionDiagnostics = document.getElementById('connection-diagnostics');
const manualSendGuard = document.getElementById('manual-send-guard');
const projectRootMemory = document.getElementById('project-root-memory');
const projectRootLabels = document.getElementById('project-root-labels');
const commandTemplates = document.getElementById('command-templates');
const sessionSummary = document.getElementById('session-summary');
const finalReviewChecklist = document.getElementById('final-review-checklist');
const roundtripStatus = document.getElementById('roundtrip-status');
const diffPreview = document.getElementById('diff-preview');
const artifactOpenPlan = document.getElementById('artifact-open-plan');
const queue = document.getElementById('queue');
const previewApply = document.getElementById('preview-apply');
const safeChangeBlock = document.getElementById('safe-change-block');
const uploadPlan = document.getElementById('upload-plan');
const runSmoke = document.getElementById('run-smoke');
const showConnectionDiagnostics = document.getElementById('show-connection-diagnostics');
const copyConnectionDiagnostics = document.getElementById('copy-connection-diagnostics');
const detectLatest = document.getElementById('detect-latest');
const refreshQueue = document.getElementById('refresh-queue');
const clearQueue = document.getElementById('clear-queue');
const showProjectRootMemory = document.getElementById('show-project-root-memory');
const copyPreviewTemplateFromRootMemory = document.getElementById('copy-preview-template-from-root-memory');
const showProjectRootLabels = document.getElementById('show-project-root-labels');
const copyProjectRootLabelMap = document.getElementById('copy-project-root-label-map');
const clearProjectRootMemory = document.getElementById('clear-project-root-memory');
const showCommandTemplates = document.getElementById('show-command-templates');
const copyRecommendedCommandTemplate = document.getElementById('copy-recommended-command-template');
const commandTemplateSelect = document.getElementById('command-template-select');
const copySelectedCommandTemplate = document.getElementById('copy-selected-command-template');
const showSessionSummary = document.getElementById('show-session-summary');
const copySessionSummary = document.getElementById('copy-session-summary');
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

function writeConnectionDiagnostics(value) {
  connectionDiagnostics.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeManualSendGuard(value = buildManualSendGuardText()) {
  manualSendGuard.textContent = value;
}

function writeProjectRootMemory(value) {
  projectRootMemory.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeProjectRootLabels(value) {
  projectRootLabels.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeCommandTemplates(value) {
  commandTemplates.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeSessionSummary(value) {
  sessionSummary.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
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

async function updateProjectRootLabels(memory) {
  const customLabels = await getStorageValue(PROJECT_ROOT_LABELS_KEY) ?? {};
  const labels = buildProjectRootLabels(memory, customLabels);
  writeProjectRootLabels(formatProjectRootLabels(labels));
  return labels;
}

async function updateProjectRootMemory(currentQueue) {
  const storedRoots = await getStorageValue(PROJECT_ROOT_MEMORY_KEY) ?? [];
  const mergedRoots = mergeProjectRootMemory(currentQueue, storedRoots);
  await setStorageValue(PROJECT_ROOT_MEMORY_KEY, mergedRoots);
  const memory = buildProjectRootMemory([], mergedRoots);
  writeProjectRootMemory(formatProjectRootMemory(memory));
  await updateProjectRootLabels(memory);
  return memory;
}

async function buildCommandTemplateRootContext(currentQueue) {
  const storedRoots = await getStorageValue(PROJECT_ROOT_MEMORY_KEY) ?? [];
  const customLabels = await getStorageValue(PROJECT_ROOT_LABELS_KEY) ?? {};
  return { storedRoots, customLabels };
}

async function updateCommandTemplates(currentQueue) {
  const insertion = await getStorageValue(LAST_INSERTION_KEY);
  const applyBlockState = await getStorageValue(LAST_APPLY_BLOCK_KEY);
  const rootContext = await buildCommandTemplateRootContext(currentQueue);
  const library = buildRootAwareCommandTemplateLibrary(currentQueue, insertion, applyBlockState, rootContext);
  writeCommandTemplates(formatRootAwareCommandTemplateLibrary(library));
  return library;
}

async function updateSessionSummary(currentQueue) {
  const insertion = await getStorageValue(LAST_INSERTION_KEY);
  const applyBlockState = await getStorageValue(LAST_APPLY_BLOCK_KEY);
  const summary = buildBrowserSessionSummary(currentQueue, insertion, applyBlockState);
  writeSessionSummary(formatBrowserSessionSummary(summary));
  return summary;
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
    await updateProjectRootMemory([]);
    await updateCommandTemplates([]);
    await updateSessionSummary([]);
    await updateRoundtripPanel([]);
    updateDiffPreview([]);
    updateArtifactOpenPlan([]);
    await updateFinalReviewChecklist([]);
    return [];
  }
  const currentQueue = response.queue ?? [];
  writeQueue(formatDeliveryQueue(currentQueue));
  await updateProjectRootMemory(currentQueue);
  await updateCommandTemplates(currentQueue);
  await updateSessionSummary(currentQueue);
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

async function loadConnectionDiagnostics() {
  const response = await sendRuntimeMessage({ type: 'ULTIMATEBRIDGE_GET_CONNECTION_DIAGNOSTICS' });
  if (!response?.ok) {
    const text = `Browser/native diagnostics unavailable.\nerror=${response?.error ?? 'UNKNOWN'}`;
    writeConnectionDiagnostics(text);
    return text;
  }
  const text = formatBrowserNativeConnectionDiagnostics(response.diagnostics);
  writeConnectionDiagnostics(text);
  return text;
}

async function getLatestPreviewItem() {
  const currentQueue = await loadQueue();
  return findLatestPreviewQueueItem(currentQueue);
}

async function showLatestProjectRootMemory() {
  const currentQueue = await loadQueue();
  const storedRoots = await getStorageValue(PROJECT_ROOT_MEMORY_KEY) ?? [];
  const memory = buildProjectRootMemory(currentQueue, storedRoots);
  const text = formatProjectRootMemory(memory);
  writeProjectRootMemory(text);
  await updateProjectRootLabels(memory);
  return { memory, text };
}

async function showLatestProjectRootLabels() {
  const { memory } = await showLatestProjectRootMemory();
  const customLabels = await getStorageValue(PROJECT_ROOT_LABELS_KEY) ?? {};
  const labels = buildProjectRootLabels(memory, customLabels);
  const text = formatProjectRootLabels(labels);
  writeProjectRootLabels(text);
  return { labels, text };
}

async function showLatestCommandTemplates() {
  const currentQueue = await loadQueue();
  const insertion = await getStorageValue(LAST_INSERTION_KEY);
  const applyBlockState = await getStorageValue(LAST_APPLY_BLOCK_KEY);
  const rootContext = await buildCommandTemplateRootContext(currentQueue);
  const library = buildRootAwareCommandTemplateLibrary(currentQueue, insertion, applyBlockState, rootContext);
  const text = formatRootAwareCommandTemplateLibrary(library);
  writeCommandTemplates(text);
  return { library, text };
}

async function copyCommandTemplateById(templateId, copyKind) {
  const { library } = await showLatestCommandTemplates();
  const template = getRootAwareCommandTemplateById(library, templateId);
  if (!template?.copyText) {
    writeStatus(`No ${copyKind} command template is available.`);
    return null;
  }
  await navigator.clipboard.writeText(template.copyText);
  const labelSuffix = template.rootLabel ? ` for ${template.rootLabel}` : '';
  writeStatus(`${copyKind} root-aware command template copied: ${template.id}${labelSuffix}`);
  return template;
}

async function showLatestSessionSummary() {
  const currentQueue = await loadQueue();
  const insertion = await getStorageValue(LAST_INSERTION_KEY);
  const applyBlockState = await getStorageValue(LAST_APPLY_BLOCK_KEY);
  const summary = buildBrowserSessionSummary(currentQueue, insertion, applyBlockState);
  const text = formatBrowserSessionSummary(summary);
  writeSessionSummary(text);
  return text;
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

showConnectionDiagnostics.addEventListener('click', async () => {
  try {
    await loadConnectionDiagnostics();
    writeStatus('Browser/native diagnostics loaded. Report-only; no native message was sent.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copyConnectionDiagnostics.addEventListener('click', async () => {
  try {
    const text = await loadConnectionDiagnostics();
    await navigator.clipboard.writeText(text);
    writeStatus('Browser/native diagnostics copied to clipboard. Review before sharing.');
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
    await updateProjectRootMemory([]);
    await updateCommandTemplates([]);
    await updateSessionSummary([]);
    await updateRoundtripPanel([]);
    updateDiffPreview([]);
    updateArtifactOpenPlan([]);
    await updateFinalReviewChecklist([]);
    writeStatus('Delivery queue cleared. Project root memory and labels were kept.');
  } else {
    writeStatus(response?.error ?? 'Could not clear delivery queue.');
  }
});

showProjectRootMemory.addEventListener('click', async () => {
  try {
    await showLatestProjectRootMemory();
    writeStatus('Project root memory loaded.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copyPreviewTemplateFromRootMemory.addEventListener('click', async () => {
  try {
    const { memory } = await showLatestProjectRootMemory();
    const template = buildPreviewTemplateFromProjectRootMemory(memory);
    writePreviewApply(template);
    await navigator.clipboard.writeText(template);
    writeStatus('SAFE_CHANGE_PREVIEW template copied from project root memory. Review before sending.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

showProjectRootLabels.addEventListener('click', async () => {
  try {
    await showLatestProjectRootLabels();
    writeStatus('Project root labels loaded.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copyProjectRootLabelMap.addEventListener('click', async () => {
  try {
    const { labels } = await showLatestProjectRootLabels();
    await navigator.clipboard.writeText(JSON.stringify(buildProjectRootLabelMap(labels), null, 2));
    writeStatus('Project root label map copied.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

clearProjectRootMemory.addEventListener('click', async () => {
  try {
    await removeStorageValue(PROJECT_ROOT_MEMORY_KEY);
    const memory = buildProjectRootMemory([], []);
    writeProjectRootMemory(formatProjectRootMemory(memory));
    await updateProjectRootLabels(memory);
    writeStatus('Project root memory cleared. Labels were kept.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

showCommandTemplates.addEventListener('click', async () => {
  try {
    await showLatestCommandTemplates();
    writeStatus('Root-aware command templates loaded.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copyRecommendedCommandTemplate.addEventListener('click', async () => {
  try {
    const { library } = await showLatestCommandTemplates();
    await copyCommandTemplateById(library.nextRecommendedTemplateId, 'Recommended');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copySelectedCommandTemplate.addEventListener('click', async () => {
  try {
    await copyCommandTemplateById(commandTemplateSelect.value, 'Selected');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

showSessionSummary.addEventListener('click', async () => {
  try {
    await showLatestSessionSummary();
    writeStatus('Session summary loaded.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
  }
});

copySessionSummary.addEventListener('click', async () => {
  try {
    const text = await showLatestSessionSummary();
    await navigator.clipboard.writeText(text);
    writeStatus('Session summary copied to clipboard.');
  } catch (error) {
    writeStatus(`ERROR: ${error.message}`);
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
