import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBrowserRoundtripProof,
  formatBrowserRoundtripProof,
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
