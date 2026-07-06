const status = document.getElementById('status');
const runSmoke = document.getElementById('run-smoke');
const detectLatest = document.getElementById('detect-latest');

function writeStatus(value) {
  status.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

runSmoke.addEventListener('click', async () => {
  writeStatus('Running native read-only smoke...');
  const response = await chrome.runtime.sendMessage({ type: 'ULTIMATEBRIDGE_RUN_READONLY_SMOKE' });
  writeStatus(response);
});

detectLatest.addEventListener('click', async () => {
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
});
