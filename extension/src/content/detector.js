const LEGACY_MARKER = 'AUTO_BRIDGE_REQUEST_ID=';

function findLatestBridgeBlock() {
  const blocks = Array.from(document.querySelectorAll('pre, code, textarea'));
  return blocks.reverse().map((node) => node.innerText || node.value || '').find((text) => text.includes(LEGACY_MARKER));
}

window.UltimateBridgeDetectLatest = function UltimateBridgeDetectLatest() {
  const body = findLatestBridgeBlock();
  if (!body) return { found: false };

  chrome.runtime.sendMessage({
    type: 'ULTIMATEBRIDGE_REQUEST_DETECTED',
    body
  });

  return { found: true };
};
