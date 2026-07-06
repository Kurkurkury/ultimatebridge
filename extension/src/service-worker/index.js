import { sendNativeMessage } from '../transport/native-client.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'ULTIMATEBRIDGE_REQUEST_DETECTED') {
    return false;
  }

  sendNativeMessage({ body: message.body })
    .then((response) => sendResponse({ ok: true, response }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
