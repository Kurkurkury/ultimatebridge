import { buildFinalReviewChecklist } from './final-review-checklist.js';

export function buildBrowserSessionSummary(queue, insertion = null, applyBlockState = null) {
  const entries = Array.isArray(queue) ? queue : [];
  const latestJob = entries[0] ?? null;
  const latestPreview = entries.find((item) => item?.isPreview && item?.previewHash) ?? null;
  const latestApply = entries.find((item) => !item?.isPreview && item?.summary?.includes('SAFE_CHANGE applied')) ?? null;
  const checklist = buildFinalReviewChecklist(entries, insertion, applyBlockState);
  const latestProjectRoot = latestPreview?.approvedProjectRoot ?? applyBlockState?.approvedProjectRoot ?? null;

  return {
    available: entries.length > 0,
    queueCount: entries.length,
    latestJobId: latestJob?.jobId ?? null,
    latestJobStatus: latestJob?.status ?? null,
    latestJobSummary: latestJob?.summary ?? null,
    latestProjectRoot,
    previewJobId: latestPreview?.jobId ?? null,
    applyJobId: latestApply?.jobId ?? null,
    previewHash: latestPreview?.previewHash ?? null,
    applyHash: latestApply?.previewHash ?? null,
    applyStatus: latestApply?.status ?? null,
    insertOk: insertion?.ok === true,
    submitted: insertion?.submitted === true,
    insertHash: insertion?.hash ?? null,
    applyBlockBuilt: applyBlockState?.built === true,
    applyBlockHash: applyBlockState?.blockHash ?? null,
    readyToApply: checklist.readyToApply,
    readyToComplete: checklist.readyToComplete,
    nextAction: checklist.nextAction,
    chatgptNextMessage: buildNextChatGptMessage(checklist),
    recentJobs: entries.slice(0, 5).map((item, index) => ({
      index,
      jobId: item?.jobId ?? null,
      status: item?.status ?? null,
      isPreview: item?.isPreview === true,
      summary: item?.summary ?? null,
      artifactCount: item?.artifactCount ?? (Array.isArray(item?.artifacts) ? item.artifacts.length : 0)
    }))
  };
}

export function formatBrowserSessionSummary(summary) {
  if (!summary?.available) {
    return [
      'ULTIMATEBRIDGE SESSION SUMMARY',
      'available=false',
      'nextAction=Run a bridge task first.',
      'chatgptNextMessage=Run a READ_ONLY or SAFE_CHANGE_PREVIEW task first.'
    ].join('\n');
  }

  const lines = [
    'ULTIMATEBRIDGE SESSION SUMMARY',
    'available=true',
    `queueCount=${summary.queueCount}`,
    `latestJobId=${summary.latestJobId ?? '(none)'}`,
    `latestJobStatus=${summary.latestJobStatus ?? '(none)'}`,
    `latestJobSummary=${summary.latestJobSummary ?? '(none)'}`,
    `latestProjectRoot=${summary.latestProjectRoot ?? '(none)'}`,
    `previewJobId=${summary.previewJobId ?? '(none)'}`,
    `applyJobId=${summary.applyJobId ?? '(none)'}`,
    `previewHash=${summary.previewHash ?? '(none)'}`,
    `applyHash=${summary.applyHash ?? '(none)'}`,
    `applyStatus=${summary.applyStatus ?? '(none)'}`,
    `applyBlockBuilt=${summary.applyBlockBuilt}`,
    `applyBlockHash=${summary.applyBlockHash ?? '(none)'}`,
    `insertOk=${summary.insertOk}`,
    `insertHash=${summary.insertHash ?? '(none)'}`,
    `submitted=${summary.submitted}`,
    `readyToApply=${summary.readyToApply}`,
    `readyToComplete=${summary.readyToComplete}`,
    `nextAction=${summary.nextAction}`,
    `chatgptNextMessage=${summary.chatgptNextMessage}`,
    '',
    'recentJobs:'
  ];

  for (const job of summary.recentJobs ?? []) {
    lines.push(`- [${job.index}] ${job.jobId ?? '(none)'} status=${job.status ?? '(none)'} preview=${job.isPreview} artifacts=${job.artifactCount} summary=${job.summary ?? '(none)'}`);
  }

  return lines.join('\n');
}

function buildNextChatGptMessage(checklist) {
  if (checklist.readyToComplete) {
    return 'The Preview→Apply cycle is complete. Review the artifacts and mark this milestone complete.';
  }
  if (checklist.readyToApply) {
    return 'The apply block is inserted and ready. Manually send it, then refresh the UltimateBridge queue.';
  }

  const missing = checklist.checks?.find((item) => !item.ok)?.id ?? 'unknown';
  return {
    previewAvailable: 'Run SAFE_CHANGE_PREVIEW first.',
    previewHashAvailable: 'Run SAFE_CHANGE_PREVIEW again because the preview hash is missing.',
    previewDiffAvailable: 'Regenerate preview so the diff artifact is available.',
    previewJsonAvailable: 'Regenerate preview so the preview JSON artifact is available.',
    previewChangesAvailable: 'Run a preview with structured changes.',
    applyBlockBuilt: 'Build the SAFE_CHANGE apply block in the UltimateBridge popup.',
    applyBlockMatchesPreviewHash: 'Rebuild the apply block from the latest preview.',
    manualReviewRequired: 'Rebuild the apply block so manualReviewRequired is present.',
    manualSendOnly: 'Rebuild the apply block so sendBehavior is manual-send only.',
    inserted: 'Insert the SAFE_CHANGE apply block into the ChatGPT input.',
    notAutoSubmitted: 'Use the safe insert-only path; do not auto-submit.',
    applyOk: 'Manually send the inserted SAFE_CHANGE apply block, then refresh the queue.',
    applyHashMatchesPreview: 'Rerun apply from the latest preview hash.',
    rollbackPlanAvailable: 'Verify rollback artifacts before marking complete.',
    rollbackRestoreCommandAvailable: 'Verify rollback restore command before marking complete.',
    artifactsReviewable: 'Refresh the delivery queue and artifact plan.'
  }[missing] ?? 'Continue the missing UltimateBridge checklist step.';
}
