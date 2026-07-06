import { formatDeliveryQueue, formatDeliveryResponse } from '../delivery-queue.js';

const status = document.getElementById('status');
const queue = document.getElementById('queue');
const runSmoke = document.getElementById('run-smoke');
const detectLatest = document.getElementById('detect-latest');
const refreshQueue = document.getElementById('refresh-queue');
const clearQueue = document.getElementById('clear-queue');

function writeStatus(value) {
  status.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function writeQueue(value) {
  queue.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
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
    return;
  }
  writeQueue(formatDeliveryQueue(response.queue));
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
    writeStatus('Delivery queue cleared.');
  } else {
    writeStatus(response?.error ?? 'Could not clear delivery queue.');
  }
});

loadQueue().catch((error) => writeQueue(`ERROR: ${error.message}`));
