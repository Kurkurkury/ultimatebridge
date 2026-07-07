export function buildFinalReviewChecklist(queue, insertion = null, applyBlockState = null) {
  const entries = Array.isArray(queue) ? queue : [];
  const latestPreview = entries.find((item) => item?.isPreview && item?.previewHash) ?? null;
  const latestApply = entries.find((item) => !item?.isPreview && item?.summary?.includes('SAFE_CHANGE applied')) ?? null;
  const rollbackPlan = latestApply?.artifacts?.find((artifact) => String(artifact?.path ?? '').replace(/\\/g, '/').endsWith('/rollback-plan.json')) ?? null;
  const rollbackCommand = latestApply?.artifacts?.find((artifact) => String(artifact?.path ?? '').replace(/\\/g, '/').endsWith('/rollback-restore-command.txt')) ?? null;

  const checks = [
    check('previewAvailable', Boolean(latestPreview), 'SAFE_CHANGE_PREVIEW exists in delivery queue.'),
    check('previewHashAvailable', Boolean(latestPreview?.previewHash), 'Preview hash exists.'),
    check('previewDiffAvailable', Boolean(latestPreview?.previewDiffPath), 'Preview diff artifact is available.'),
    check('previewJsonAvailable', Boolean(latestPreview?.previewJsonPath), 'Preview JSON artifact is available.'),
    check('previewChangesAvailable', Boolean(latestPreview?.previewChanges?.length), 'Structured preview changes are available.'),
    check('applyBlockBuilt', Boolean(applyBlockState?.built), 'SAFE_CHANGE apply block has been built in the popup.'),
    check('applyBlockMatchesPreviewHash', Boolean(applyBlockState?.requiredPreviewHash && latestPreview?.previewHash && applyBlockState.requiredPreviewHash === latestPreview.previewHash), 'Apply block requiredPreviewHash matches latest preview hash.'),
    check('manualReviewRequired', applyBlockState?.manualReviewRequired === true, 'Apply block requires manual review.'),
    check('manualSendOnly', applyBlockState?.sendBehavior === 'USER_MUST_REVIEW_AND_SEND_MANUALLY', 'Apply block is marked manual-send only.'),
    check('inserted', insertion?.ok === true, 'Apply block was inserted into the browser input.'),
    check('notAutoSubmitted', insertion?.submitted === false, 'Inserted block was not submitted automatically.'),
    check('applyOk', latestApply?.status === 'OK', 'SAFE_CHANGE apply job completed OK.'),
    check('applyHashMatchesPreview', Boolean(latestApply?.previewHash && latestPreview?.previewHash && latestApply.previewHash === latestPreview.previewHash), 'Apply preview hash matches latest preview hash.'),
    check('rollbackPlanAvailable', Boolean(rollbackPlan), 'Rollback plan artifact is available.'),
    check('rollbackRestoreCommandAvailable', Boolean(rollbackCommand), 'Rollback restore command artifact is available.'),
    check('artifactsReviewable', Boolean((latestPreview?.artifacts?.length ?? 0) + (latestApply?.artifacts?.length ?? 0)), 'Preview/apply artifacts are available for review.')
  ];

  const readyToApply = checksById(checks, [
    'previewAvailable',
    'previewHashAvailable',
    'previewDiffAvailable',
    'previewJsonAvailable',
    'previewChangesAvailable',
    'applyBlockBuilt',
    'applyBlockMatchesPreviewHash',
    'manualReviewRequired',
    'manualSendOnly',
    'inserted',
    'notAutoSubmitted'
  ]).every((item) => item.ok);

  const readyToComplete = readyToApply && checksById(checks, [
    'applyOk',
    'applyHashMatchesPreview',
    'rollbackPlanAvailable',
    'rollbackRestoreCommandAvailable',
    'artifactsReviewable'
  ]).every((item) => item.ok);

  return {
    previewJobId: latestPreview?.jobId ?? null,
    applyJobId: latestApply?.jobId ?? null,
    previewHash: latestPreview?.previewHash ?? null,
    applyHash: latestApply?.previewHash ?? null,
    insertHash: insertion?.hash ?? null,
    applyBlockHash: applyBlockState?.blockHash ?? null,
    readyToApply,
    readyToComplete,
    nextAction: chooseNextAction({ checks, readyToApply, readyToComplete, latestApply }),
    checks
  };
}

export function formatFinalReviewChecklist(checklist) {
  if (!checklist) return 'No final review checklist available.';

  const lines = [
    'ULTIMATEBRIDGE FINAL REVIEW CHECKLIST',
    `readyToApply=${checklist.readyToApply}`,
    `readyToComplete=${checklist.readyToComplete}`,
    `previewJobId=${checklist.previewJobId ?? '(none)'}`,
    `applyJobId=${checklist.applyJobId ?? '(none)'}`,
    `previewHash=${checklist.previewHash ?? '(none)'}`,
    `applyHash=${checklist.applyHash ?? '(none)'}`,
    `applyBlockHash=${checklist.applyBlockHash ?? '(none)'}`,
    `insertHash=${checklist.insertHash ?? '(none)'}`,
    `nextAction=${checklist.nextAction}`,
    ''
  ];

  for (const item of checklist.checks ?? []) {
    lines.push(`${item.ok ? '[x]' : '[ ]'} ${item.id} - ${item.label}`);
  }

  return lines.join('\n');
}

export function buildApplyBlockStateFromRequest(applyRequest, blockHash = null) {
  return {
    built: applyRequest?.mode === 'SAFE_CHANGE',
    requestId: applyRequest?.requestId ?? null,
    taskName: applyRequest?.taskName ?? null,
    requiredPreviewHash: applyRequest?.requiredPreviewHash ?? null,
    manualReviewRequired: applyRequest?.manualReviewRequired === true,
    sendBehavior: applyRequest?.sendBehavior ?? null,
    sourcePreviewJobId: applyRequest?.sourcePreviewJobId ?? null,
    changeCount: Array.isArray(applyRequest?.changes) ? applyRequest.changes.length : 0,
    blockHash
  };
}

function check(id, ok, label) {
  return { id, ok: Boolean(ok), label };
}

function checksById(checks, ids) {
  return ids.map((id) => checks.find((item) => item.id === id)).filter(Boolean);
}

function chooseNextAction({ checks, readyToApply, readyToComplete, latestApply }) {
  if (readyToComplete) return 'Review artifacts, then mark the change complete.';
  const failed = checks.find((item) => !item.ok);
  if (!failed) return 'Review current state.';
  if (!readyToApply) return nextActionForMissingApplyReadiness(failed.id);
  if (!latestApply) return 'Manually send the inserted SAFE_CHANGE apply block, then refresh the queue.';
  return nextActionForMissingCompletion(failed.id);
}

function nextActionForMissingApplyReadiness(id) {
  return {
    previewAvailable: 'Run SAFE_CHANGE_PREVIEW first.',
    previewHashAvailable: 'Run SAFE_CHANGE_PREVIEW again and verify previewHash appears.',
    previewDiffAvailable: 'Review or regenerate SAFE_CHANGE_PREVIEW diff artifacts.',
    previewJsonAvailable: 'Review or regenerate SAFE_CHANGE_PREVIEW JSON artifact.',
    previewChangesAvailable: 'Run a preview with structured changes.',
    applyBlockBuilt: 'Build the SAFE_CHANGE apply block in the popup.',
    applyBlockMatchesPreviewHash: 'Rebuild the apply block from the latest preview.',
    manualReviewRequired: 'Rebuild the apply block so manualReviewRequired is present.',
    manualSendOnly: 'Rebuild the apply block so sendBehavior is manual-send only.',
    inserted: 'Insert the SAFE_CHANGE apply block into the browser input.',
    notAutoSubmitted: 'Do not auto-submit; reinsert using the safe insert-only path.'
  }[id] ?? 'Complete missing apply-readiness checks.';
}

function nextActionForMissingCompletion(id) {
  return {
    applyOk: 'Run or rerun the SAFE_CHANGE apply block and verify status OK.',
    applyHashMatchesPreview: 'Rerun apply from the latest preview hash.',
    rollbackPlanAvailable: 'Verify rollback plan artifact exists before completion.',
    rollbackRestoreCommandAvailable: 'Verify rollback restore command exists before completion.',
    artifactsReviewable: 'Refresh the delivery queue and artifact plan.'
  }[id] ?? 'Complete missing completion checks.';
}
