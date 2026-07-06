const LEGACY_MARKER = 'AUTO_BRIDGE_REQUEST_ID=';

function findLatestBridgeBlock() {
  const blocks = Array.from(document.querySelectorAll('pre, code, textarea'));
  return blocks.reverse().map((node) => node.innerText || node.value || '').find((text) => text.includes(LEGACY_MARKER));
}

function showUltimateBridgeStatus(text, ok = true) {
  let box = document.getElementById('ultimatebridge-status-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'ultimatebridge-status-box';
    box.style.position = 'fixed';
    box.style.right = '16px';
    box.style.bottom = '16px';
    box.style.zIndex = '2147483647';
    box.style.maxWidth = '520px';
    box.style.padding = '10px 12px';
    box.style.borderRadius = '8px';
    box.style.fontFamily = 'monospace';
    box.style.fontSize = '12px';
    box.style.whiteSpace = 'pre-wrap';
    box.style.boxShadow = '0 4px 20px rgba(0,0,0,.25)';
    document.body.appendChild(box);
  }

  box.style.background = ok ? '#0b3d20' : '#4a1010';
  box.style.color = '#ffffff';
  box.textContent = text;
}

window.UltimateBridgeDetectLatest = async function UltimateBridgeDetectLatest() {
  const body = findLatestBridgeBlock();
  if (!body) {
    showUltimateBridgeStatus('UltimateBridge: no bridge block found', false);
    return { found: false };
  }

  showUltimateBridgeStatus('UltimateBridge: sending request to native host...');

  const response = await chrome.runtime.sendMessage({
    type: 'ULTIMATEBRIDGE_REQUEST_DETECTED',
    body
  });

  const ok = Boolean(response?.ok && response?.response?.ok);
  const status = response?.response?.report?.status ?? response?.response?.status ?? response?.error ?? 'UNKNOWN';
  const jobId = response?.response?.job?.jobId ?? 'NO_JOB';

  showUltimateBridgeStatus(`UltimateBridge: ${ok ? 'OK' : 'FAILED'}\nstatus=${status}\njobId=${jobId}`, ok);
  return { found: true, ok, status, jobId, response };
};

window.UltimateBridgeRunReadonlySmoke = async function UltimateBridgeRunReadonlySmoke() {
  showUltimateBridgeStatus('UltimateBridge: running read-only smoke through native host...');
  const response = await chrome.runtime.sendMessage({ type: 'ULTIMATEBRIDGE_RUN_READONLY_SMOKE' });
  const ok = Boolean(response?.ok && response?.response?.ok);
  const status = response?.response?.report?.status ?? response?.response?.status ?? response?.error ?? 'UNKNOWN';
  const jobId = response?.response?.job?.jobId ?? 'NO_JOB';
  showUltimateBridgeStatus(`UltimateBridge smoke: ${ok ? 'OK' : 'FAILED'}\nstatus=${status}\njobId=${jobId}`, ok);
  return { ok, status, jobId, response };
};
