import { sendNativeMessage } from '../transport/native-client.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'ULTIMATEBRIDGE_REQUEST_DETECTED') {
    sendNativeMessage({ body: message.body })
      .then((response) => sendResponse({ ok: true, response }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'ULTIMATEBRIDGE_RUN_READONLY_SMOKE') {
    const body = [
      'AUTO_BRIDGE_REQUEST_ID=AUTO',
      '& .\\runner\\powershell\\UB_BeginTask.ps1 HealthCheck'
    ].join('\n');

    sendNativeMessage({ body })
      .then((response) => sendResponse({ ok: true, response }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
