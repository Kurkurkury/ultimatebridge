import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBrowserRoundtripProof,
  buildRoundtripPanelState,
  formatBrowserRoundtripProof,
  formatRoundtripPanelState,
  ROUNDTRIP_PROOF_PROTOCOL
} from '../extension/src/roundtrip-proof.js';

const previewHash = 'b'.repeat(64);
const previewJobId = 'PREVIEW_JOB';

const proofInput = {
  previewResponse: {
    ok: true,
    request: { mode: 'SAFE_CHANGE_PREVIEW' },
    job: { jobId: previewJobId },
    report: { status: 'OK' }
  },
  previewQueueItem: {
    isPreview: true,
    jobId: previewJobId,
    previewHash,
    requiredPreviewHash: previewHash,
    previewJsonPath: 'C:/run/safe-change-preview.json',
    previewDiffPath: 'C:/run/safe-change-preview.diff.txt'
  },
  applyRequest: {
    mode: 'SAFE_CHANGE',
    requiredPreviewHash: previewHash,
    manualReviewRequired: true,
    sendBehavior: 'USER_MUST_REVIEW_AND_SEND_MANUALLY',
    sourcePreviewJobId: previewJobId,
    changes: [{ op: 'replaceText', path: 'file.txt', search: 'a', replace: 'b' }]
  },
  insertion: {
    ok: true,
    submitted: false,
    hash: 'insert-hash'
  },
  applyResponse: {
    ok: true,
    request: { mode: 'SAFE_CHANGE' },
    job: { jobId: 'APPLY_JOB' },
    report: {
      status: 'OK',
      summary: 'previewHashRequired=true\npreviewHashMatched=true'
    }
  },
  applyQueueItem: {
    jobId: 'APPLY_JOB'
  }
};

const previewQueueItem = {
  isPreview: true,
  jobId: previewJobId,
  status: 'OK',
  summary: 'SAFE_CHANGE_PREVIEW changes=1',
  previewHash,
  requiredPreviewHash: previewHash,
  previewJsonPath: 'C:/run/safe-change-preview.json',
  previewDiffPath: 'C:/run/safe-change-preview.diff.txt'
};

const applyQueueItem = {
  isPreview: false,
  jobId: 'APPLY_JOB',
  status: 'OK',
  summary: 'SAFE_CHANGE applied changes=1',
  previewHash,
  requiredPreviewHash: previewHash
};

test('buildBrowserRoundtripProof reports full preview apply success', () => {
  const proof = buildBrowserRoundtripProof(proofInput);
  assert.equal(proof.protocol, ROUNDTRIP_PROOF_PROTOCOL);
  assert.equal(proof.preview.previewHash, previewHash);
  assert.equal(proof.applyBlock.requiredPreviewHash, previewHash);
  assert.equal(proof.applyBlock.manualReviewRequired, true);
  assert.equal(proof.insertion.submitted, false);
  assert.equal(proof.apply.previewHashMatched, true);
  assert.equal(proof.allOk, true);
});

test('buildBrowserRoundtripProof fails when insertion was submitted', () => {
  const proof = buildBrowserRoundtripProof({
    ...proofInput,
    insertion: { ok: true, submitted: true, hash: 'insert-hash' }
  });
  assert.equal(proof.allOk, false);
});

test('formatBrowserRoundtripProof is readable', () => {
  const proof = buildBrowserRoundtripProof(proofInput);
  const text = formatBrowserRoundtripProof(proof);
  assert.match(text, /allOk=true/);
  assert.match(text, /manualReviewRequired=true/);
  assert.match(text, /submitted=false/);
  assert.match(text, /previewHashMatched=true/);
});

test('buildRoundtripPanelState reports popup-ready status from queue and insertion', () => {
  const state = buildRoundtripPanelState([applyQueueItem, previewQueueItem], { ok: true, submitted: false, hash: 'insert-hash' });
  assert.equal(state.previewJobId, previewJobId);
  assert.equal(state.previewHash, previewHash);
  assert.equal(state.applyJobId, 'APPLY_JOB');
  assert.equal(state.applyHash, previewHash);
  assert.equal(state.insertOk, true);
  assert.equal(state.submitted, false);
  assert.equal(state.previewHashMatched, true);
  assert.equal(state.allOk, true);
});

test('buildRoundtripPanelState is not allOk without insert proof', () => {
  const state = buildRoundtripPanelState([applyQueueItem, previewQueueItem], null);
  assert.equal(state.insertOk, false);
  assert.equal(state.allOk, false);
});

test('formatRoundtripPanelState shows key popup fields', () => {
  const state = buildRoundtripPanelState([applyQueueItem, previewQueueItem], { ok: true, submitted: false, hash: 'insert-hash' });
  const text = formatRoundtripPanelState(state);
  assert.match(text, /ULTIMATEBRIDGE ROUNDTRIP STATUS/);
  assert.match(text, /allOk=true/);
  assert.match(text, /applyHash=/);
  assert.match(text, /insertOk=true/);
  assert.match(text, /submitted=false/);
  assert.match(text, /previewHashMatched=true/);
});
