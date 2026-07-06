export const ROUNDTRIP_PROOF_PROTOCOL = 'ULTIMATEBRIDGE_BROWSER_PREVIEW_APPLY_ROUNDTRIP_PROOF_V1';

export function buildBrowserRoundtripProof(input) {
  const previewResponse = input?.previewResponse ?? {};
  const previewQueueItem = input?.previewQueueItem ?? {};
  const applyRequest = input?.applyRequest ?? {};
  const insertion = input?.insertion ?? {};
  const applyResponse = input?.applyResponse ?? {};
  const applyQueueItem = input?.applyQueueItem ?? null;

  const previewReport = previewResponse.report ?? {};
  const applyReport = applyResponse.report ?? {};
  const applySummary = String(applyReport.summary ?? '');

  const proof = {
    protocol: ROUNDTRIP_PROOF_PROTOCOL,
    preview: {
      ok: Boolean(previewResponse.ok),
      jobId: previewResponse.job?.jobId ?? previewReport.jobId ?? null,
      status: previewReport.status ?? null,
      mode: previewResponse.request?.mode ?? null,
      previewHash: previewQueueItem.previewHash ?? null,
      requiredPreviewHash: previewQueueItem.requiredPreviewHash ?? null,
      previewJsonPath: previewQueueItem.previewJsonPath ?? null,
      previewDiffPath: previewQueueItem.previewDiffPath ?? null,
      queueCaptured: Boolean(previewQueueItem.isPreview && previewQueueItem.previewHash)
    },
    applyBlock: {
      built: applyRequest.mode === 'SAFE_CHANGE',
      mode: applyRequest.mode ?? null,
      requiredPreviewHash: applyRequest.requiredPreviewHash ?? null,
      manualReviewRequired: applyRequest.manualReviewRequired === true,
      sendBehavior: applyRequest.sendBehavior ?? null,
      sourcePreviewJobId: applyRequest.sourcePreviewJobId ?? null,
      changeCount: Array.isArray(applyRequest.changes) ? applyRequest.changes.length : 0
    },
    insertion: {
      ok: insertion.ok === true,
      submitted: insertion.submitted === true,
      hash: insertion.hash ?? null
    },
    apply: {
      ok: Boolean(applyResponse.ok),
      jobId: applyResponse.job?.jobId ?? applyReport.jobId ?? null,
      status: applyReport.status ?? null,
      mode: applyResponse.request?.mode ?? null,
      previewHashMatched: applySummary.includes('previewHashMatched=true'),
      previewHashRequired: applySummary.includes('previewHashRequired=true'),
      queueCaptured: Boolean(applyQueueItem?.jobId)
    }
  };

  proof.allOk = Boolean(
    proof.preview.ok &&
    proof.preview.status === 'OK' &&
    proof.preview.mode === 'SAFE_CHANGE_PREVIEW' &&
    proof.preview.previewHash &&
    proof.preview.requiredPreviewHash === proof.preview.previewHash &&
    proof.preview.previewJsonPath &&
    proof.preview.previewDiffPath &&
    proof.preview.queueCaptured &&
    proof.applyBlock.built &&
    proof.applyBlock.requiredPreviewHash === proof.preview.previewHash &&
    proof.applyBlock.manualReviewRequired &&
    proof.applyBlock.sendBehavior === 'USER_MUST_REVIEW_AND_SEND_MANUALLY' &&
    proof.applyBlock.sourcePreviewJobId === proof.preview.jobId &&
    proof.applyBlock.changeCount > 0 &&
    proof.insertion.ok &&
    proof.insertion.submitted === false &&
    proof.apply.ok &&
    proof.apply.status === 'OK' &&
    proof.apply.mode === 'SAFE_CHANGE' &&
    proof.apply.previewHashRequired &&
    proof.apply.previewHashMatched
  );

  return proof;
}

export function formatBrowserRoundtripProof(proof) {
  if (!proof) return 'No browser roundtrip proof available.';

  return [
    `protocol=${proof.protocol}`,
    `allOk=${proof.allOk}`,
    `previewJobId=${proof.preview?.jobId ?? '(none)'}`,
    `previewHash=${proof.preview?.previewHash ?? '(none)'}`,
    `previewJsonPath=${proof.preview?.previewJsonPath ?? '(none)'}`,
    `previewDiffPath=${proof.preview?.previewDiffPath ?? '(none)'}`,
    `applyBlockBuilt=${proof.applyBlock?.built}`,
    `manualReviewRequired=${proof.applyBlock?.manualReviewRequired}`,
    `sendBehavior=${proof.applyBlock?.sendBehavior ?? '(none)'}`,
    `inserted=${proof.insertion?.ok}`,
    `submitted=${proof.insertion?.submitted}`,
    `applyJobId=${proof.apply?.jobId ?? '(none)'}`,
    `applyStatus=${proof.apply?.status ?? '(none)'}`,
    `previewHashMatched=${proof.apply?.previewHashMatched}`
  ].join('\n');
}
