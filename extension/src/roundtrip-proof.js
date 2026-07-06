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

export function buildRoundtripPanelState(queue, insertion = null) {
  const entries = Array.isArray(queue) ? queue : [];
  const latestPreview = entries.find((item) => item?.isPreview && item?.previewHash) ?? null;
  const latestApply = entries.find((item) => !item?.isPreview && item?.previewHash && item?.requiredPreviewHash) ?? null;
  const previewHashMatched = Boolean(latestApply?.summary?.includes('SAFE_CHANGE applied') && latestApply?.previewHash && latestPreview?.previewHash && latestApply.previewHash === latestPreview.previewHash);

  const state = {
    protocol: ROUNDTRIP_PROOF_PROTOCOL,
    previewJobId: latestPreview?.jobId ?? null,
    previewHash: latestPreview?.previewHash ?? null,
    requiredPreviewHash: latestPreview?.requiredPreviewHash ?? null,
    previewJsonPath: latestPreview?.previewJsonPath ?? null,
    previewDiffPath: latestPreview?.previewDiffPath ?? null,
    applyJobId: latestApply?.jobId ?? null,
    applyHash: latestApply?.previewHash ?? null,
    applyStatus: latestApply?.status ?? null,
    insertOk: insertion?.ok === true,
    submitted: insertion?.submitted === true,
    insertHash: insertion?.hash ?? null,
    previewHashMatched
  };

  state.allOk = Boolean(
    state.previewJobId &&
    state.previewHash &&
    state.requiredPreviewHash === state.previewHash &&
    state.previewJsonPath &&
    state.previewDiffPath &&
    state.applyJobId &&
    state.applyStatus === 'OK' &&
    state.applyHash === state.previewHash &&
    state.insertOk &&
    state.submitted === false &&
    state.previewHashMatched
  );

  return state;
}

export function formatRoundtripPanelState(state) {
  if (!state) return 'No roundtrip status available.';

  return [
    'ULTIMATEBRIDGE ROUNDTRIP STATUS',
    `allOk=${state.allOk}`,
    `previewJobId=${state.previewJobId ?? '(none)'}`,
    `previewHash=${state.previewHash ?? '(none)'}`,
    `requiredPreviewHash=${state.requiredPreviewHash ?? '(none)'}`,
    `previewJsonPath=${state.previewJsonPath ?? '(none)'}`,
    `previewDiffPath=${state.previewDiffPath ?? '(none)'}`,
    `applyJobId=${state.applyJobId ?? '(none)'}`,
    `applyHash=${state.applyHash ?? '(none)'}`,
    `applyStatus=${state.applyStatus ?? '(none)'}`,
    `insertOk=${state.insertOk}`,
    `insertHash=${state.insertHash ?? '(none)'}`,
    `submitted=${state.submitted}`,
    `previewHashMatched=${state.previewHashMatched}`
  ].join('\n');
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
