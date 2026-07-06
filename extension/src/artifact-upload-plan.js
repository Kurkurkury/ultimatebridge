export const UPLOAD_PLAN_KEY = 'ultimatebridgeArtifactUploadPlan';

export function buildArtifactUploadPlan(queueItem, options = {}) {
  if (!queueItem || typeof queueItem !== 'object') {
    throw new Error('queueItem is required to build an artifact upload plan.');
  }

  const artifacts = Array.isArray(queueItem.artifacts) ? queueItem.artifacts.filter((artifact) => artifact?.upload !== false) : [];
  if (artifacts.length === 0) {
    throw new Error('No uploadable artifacts are available for this queue item.');
  }

  const confirmedAt = options.confirmedAt ?? new Date().toISOString();
  const plan = {
    protocol: 'ULTIMATEBRIDGE_USER_CONFIRMED_ARTIFACT_UPLOAD_PLAN_V1',
    action: 'manual_upload_required',
    userConfirmed: true,
    confirmedAt,
    jobId: queueItem.jobId,
    status: queueItem.status,
    deliveryMode: queueItem.deliveryMode,
    summary: queueItem.summary,
    chatTextPath: queueItem.chatTextPath ?? null,
    fullReportPath: queueItem.fullReportPath ?? null,
    artifactCount: artifacts.length,
    artifacts: artifacts.map((artifact, index) => ({
      index,
      path: artifact.path,
      kind: artifact.kind ?? 'unknown',
      size: Number(artifact.size ?? 0),
      sha256: artifact.sha256 ?? null,
      upload: artifact.upload !== false
    }))
  };

  return {
    ...plan,
    instructions: buildUploadInstructions(plan)
  };
}

export function buildUploadInstructions(plan) {
  const lines = [
    'ULTIMATEBRIDGE USER-CONFIRMED ARTIFACT UPLOAD',
    `jobId=${plan.jobId}`,
    `status=${plan.status}`,
    `deliveryMode=${plan.deliveryMode}`,
    `confirmedAt=${plan.confirmedAt}`,
    `chatTextPath=${plan.chatTextPath ?? '(none)'}`,
    `fullReportPath=${plan.fullReportPath ?? '(none)'}`,
    'Upload or attach these files only after user confirmation:'
  ];

  for (const artifact of plan.artifacts ?? []) {
    lines.push(`- [${artifact.index}] ${artifact.kind} ${artifact.size} bytes sha256=${artifact.sha256 ?? '(none)'} path=${artifact.path}`);
  }

  return lines.join('\n');
}

export function formatArtifactUploadPlan(plan) {
  if (!plan) return 'No artifact upload plan prepared.';
  return plan.instructions ?? buildUploadInstructions(plan);
}
