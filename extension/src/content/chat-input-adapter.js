async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function findChatInput() {
  return document.querySelector('textarea, div[contenteditable="true"]');
}

export async function safeInsertText(text) {
  const input = findChatInput();
  if (!input) {
    return { ok: false, reason: 'INPUT_NOT_FOUND' };
  }

  const expected = await sha256Hex(text);

  if (input.tagName === 'TEXTAREA') {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    input.textContent = text;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }

  const actualText = input.tagName === 'TEXTAREA' ? input.value : input.textContent;
  const actual = await sha256Hex(actualText ?? '');

  if (actual !== expected) {
    return { ok: false, reason: 'INPUT_HASH_MISMATCH', expected, actual };
  }

  return { ok: true, hash: actual };
}

window.UltimateBridgeSafeInsertText = safeInsertText;
