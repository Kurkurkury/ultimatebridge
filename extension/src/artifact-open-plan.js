export function buildArtifactOpenPlan(queue) {
  const entries = Array.isArray(queue) ? queue : [];
  const latestPreview = entries.find((item) => item?.isPreview && item?.previewHash) ?? null;
  const latestApply = entries.find((item) => !item?.isPreview && item?.summary?.includes('SAFE_CHANGE applied')) ?? null;
  const sources = [
    latestPreview ? { phase: 'preview', item: latestPreview } : null,
    latestApply ? { phase: 'apply', item: latestApply } : null
  ].filter(Boolean);

  if (!sources.length) {
    return {
      available: false,
      reason: 'NO_ARTIFACTS_AVAILABLE',
      nextReview: 'Run READ_ONLY, SAFE_CHANGE_PREVIEW, or SAFE_CHANGE first.',
      artifacts: []
    };
  }

  const artifacts = sources.flatMap(({ phase, item }) => normalizeArtifacts(phase, item));
  const plan = {
    available: artifacts.length > 0,
    previewJobId: latestPreview?.jobId ?? null,
    applyJobId: latestApply?.jobId ?? null,
    previewHash: latestPreview?.previewHash ?? latestApply?.previewHash ?? null,
    applyHash: latestApply?.previewHash ?? null,
    nextReview: chooseNextReview({ latestPreview, latestApply, artifacts }),
    artifacts
  };

  return plan;
}

export function formatArtifactOpenPlan(plan) {
  if (!plan?.available) {
    return [
      'ULTIMATEBRIDGE ARTIFACT OPEN/UPLOAD PLAN',
      `available=false`,
      `reason=${plan?.reason ?? 'NO_ARTIFACTS_AVAILABLE'}`,
      `nextReview=${plan?.nextReview ?? 'Run a bridge task first.'}`
    ].join('\n');
  }

  const lines = [
    'ULTIMATEBRIDGE ARTIFACT OPEN/UPLOAD PLAN',
    'available=true',
    `previewJobId=${plan.previewJobId ?? '(none)'}`,
    `applyJobId=${plan.applyJobId ?? '(none)'}`,
    `previewHash=${plan.previewHash ?? '(none)'}`,
    `applyHash=${plan.applyHash ?? '(none)'}`,
    `nextReview=${plan.nextReview ?? '(none)'}`,
    `artifactCount=${plan.artifacts.length}`
  ];

  for (const artifact of plan.artifacts) {
    lines.push('');
    lines.push(`artifact[${artifact.index}] phase=${artifact.phase}`);
    lines.push(`role=${artifact.role}`);
    lines.push(`purpose=${artifact.purpose}`);
    lines.push(`recommendedAction=${artifact.recommendedAction}`);
    lines.push(`upload=${artifact.upload}`);
    lines.push(`kind=${artifact.kind}`);
    lines.push(`size=${artifact.size}`);
    lines.push(`sha256=${artifact.sha256 ?? '(none)'}`);
    lines.push(`path=${artifact.path}`);
  }

  return lines.join('\n');
}

function normalizeArtifacts(phase, item) {
  const artifacts = Array.isArray(item.artifacts) ? item.artifacts : [];
  return artifacts.map((artifact, index) => {
    const role = classifyArtifactRole(artifact.path);
    return {
      index,
      phase,
      jobId: item.jobId ?? null,
      role,
      purpose: purposeForRole(role),
      recommendedAction: recommendedActionForRole(role),
      upload: artifact.upload !== false,
      kind: artifact.kind ?? 'unknown',
      size: Number(artifact.size ?? 0),
      sha256: artifact.sha256 ?? null,
      path: artifact.path ?? '(missing path)'
    };
  });
}

function chooseNextReview({ latestPreview, latestApply, artifacts }) {
  if (latestPreview && !latestApply) return 'Review preview diff, then build SAFE_CHANGE apply block.';
  if (latestApply) {
    const rollbackPlan = artifacts.find((artifact) => artifact.role === 'rollbackPlan');
    if (rollbackPlan) return 'Review apply result and rollback plan before considering the change complete.';
    return 'Review apply result and runner report.';
  }
  return 'Review latest runner report.';
}

function classifyArtifactRole(filePath = '') {
  const normalized = String(filePath).replace(/\\/g, '/');
  if (normalized.endsWith('/ultimatebridge-runner-report.json')) return 'runnerReport';
  if (normalized.endsWith('/safe-change-preview.json')) return 'previewJson';
  if (normalized.endsWith('/safe-change-preview.diff.txt')) return 'previewDiff';
  if (normalized.endsWith('/safe-change-result.json')) return 'applyResult';
  if (normalized.endsWith('/rollback-plan.json')) return 'rollbackPlan';
  if (normalized.endsWith('/rollback-restore-command.txt')) return 'rollbackRestoreCommand';
  if (normalized.endsWith('/delivery-plan.json')) return 'deliveryPlan';
  if (normalized.endsWith('/chatgpt-response.txt')) return 'chatResponse';
  return 'artifact';
}

function purposeForRole(role) {
  return {
    runnerReport: 'Full machine-readable task report.',
    previewJson: 'Structured non-mutating preview details.',
    previewDiff: 'Human-readable before/after diff preview.',
    applyResult: 'Structured SAFE_CHANGE apply result.',
    rollbackPlan: 'Machine-readable rollback operations.',
    rollbackRestoreCommand: 'Command to restore from rollback plan.',
    deliveryPlan: 'Delivery and upload metadata.',
    chatResponse: 'Chat-ready delivery summary.',
    artifact: 'Additional run artifact.'
  }[role] ?? 'Additional run artifact.';
}

function recommendedActionForRole(role) {
  return {
    runnerReport: 'Open or upload when debugging task status.',
    previewJson: 'Open when structured preview details are needed.',
    previewDiff: 'Review before building or sending apply block.',
    applyResult: 'Review after apply to confirm changed files and hash match.',
    rollbackPlan: 'Keep for recovery; review before marking complete.',
    rollbackRestoreCommand: 'Use only if rollback is intentionally needed.',
    deliveryPlan: 'Open when upload/staging behavior needs inspection.',
    chatResponse: 'Copy or upload when summarizing the run.',
    artifact: 'Open if more context is needed.'
  }[role] ?? 'Open if more context is needed.';
}
