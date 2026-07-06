import { sendNativeMessage } from '../transport/native-client.js';
import {
  DELIVERY_QUEUE_KEY,
  LAST_DELIVERY_KEY,
  buildDeliveryQueueItem,
  mergeDeliveryQueue
} from '../delivery-queue.js';
import {
  UPLOAD_PLAN_KEY,
  buildArtifactUploadPlan
} from '../artifact-upload-plan.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'ULTIMATEBRIDGE_REQUEST_DETECTED') {
    sendNativeMessage({ body: message.body })
      .then(async (response) => sendResponse({ ok: true, response, deliveryQueueItem: await recordDelivery(response) }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'ULTIMATEBRIDGE_RUN_READONLY_SMOKE') {
    const body = [
      'AUTO_BRIDGE_REQUEST_ID=AUTO',
      '& .\\runner\\powershell\\UB_BeginTask.ps1 HealthCheck'
    ].join('\n');

    sendNativeMessage({ body })
      .then(async (response) => sendResponse({ ok: true, response, deliveryQueueItem: await recordDelivery(response) }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'ULTIMATEBRIDGE_GET_DELIVERY_QUEUE') {
    getDeliveryQueue()
      .then((queue) => sendResponse({ ok: true, queue }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'ULTIMATEBRIDGE_CLEAR_DELIVERY_QUEUE') {
    chrome.storage.local.set({ [DELIVERY_QUEUE_KEY]: [], [LAST_DELIVERY_KEY]: null, [UPLOAD_PLAN_KEY]: null }, () => {
      sendResponse({ ok: true, queue: [] });
    });
    return true;
  }

  if (message?.type === 'ULTIMATEBRIDGE_PREPARE_LATEST_ARTIFACT_UPLOAD') {
    prepareLatestArtifactUploadPlan()
      .then((uploadPlan) => sendResponse({ ok: true, uploadPlan }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'ULTIMATEBRIDGE_GET_ARTIFACT_UPLOAD_PLAN') {
    getArtifactUploadPlan()
      .then((uploadPlan) => sendResponse({ ok: true, uploadPlan }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'ULTIMATEBRIDGE_CLEAR_ARTIFACT_UPLOAD_PLAN') {
    chrome.storage.local.set({ [UPLOAD_PLAN_KEY]: null }, () => {
      sendResponse({ ok: true, uploadPlan: null });
    });
    return true;
  }

  return false;
});

async function recordDelivery(response) {
  const item = buildDeliveryQueueItem(response);
  const queue = await getDeliveryQueue();
  const nextQueue = mergeDeliveryQueue(queue, item);
  await chrome.storage.local.set({ [DELIVERY_QUEUE_KEY]: nextQueue, [LAST_DELIVERY_KEY]: item });
  return item;
}

async function getDeliveryQueue() {
  const stored = await chrome.storage.local.get(DELIVERY_QUEUE_KEY);
  return Array.isArray(stored[DELIVERY_QUEUE_KEY]) ? stored[DELIVERY_QUEUE_KEY] : [];
}

async function prepareLatestArtifactUploadPlan() {
  const queue = await getDeliveryQueue();
  const latest = queue[0];
  if (!latest) {
    throw new Error('Delivery queue is empty. Run a bridge job before preparing upload.');
  }

  const uploadPlan = buildArtifactUploadPlan(latest);
  await chrome.storage.local.set({ [UPLOAD_PLAN_KEY]: uploadPlan });
  return uploadPlan;
}

async function getArtifactUploadPlan() {
  const stored = await chrome.storage.local.get(UPLOAD_PLAN_KEY);
  return stored[UPLOAD_PLAN_KEY] ?? null;
}
