export const DELIVERY_QUEUE_KEY = 'ultimatebridgeDeliveryQueue';
export const LAST_DELIVERY_KEY = 'ultimatebridgeLastDelivery';

export function buildDeliveryQueueItem(nativeResponse, now = new Date().toISOString()) {
  const response = nativeResponse?.response ?? nativeResponse ?? {};
  const report = response.report ?? {};
  const plan = response.deliveryPlan ?? {};
  const manifest = response.manifest ?? {};
  const artifacts = Array.isArray(plan.artifacts) ? plan.artifacts : Array.isArray(manifest.items) ? manifest.items : [];
  const jobId = plan.jobId ?? report.jobId ?? response.job?.jobId ?? 'UNKNOWN_JOB';
  const summary = String(report.summary ?? response.message ?? '');
  const previewHash = extractSummaryValue(summary, 'previewHash');
  const requiredPreviewHash = extractSummaryValue(summary, 'requiredPreviewHash');
  const previewJsonPath = findArtifactPath(artifacts, 'safe-change-preview.json');
  const previewDiffPath = findArtifactPath(artifacts, 'safe-change-preview.diff.txt');

  return {
    id: `${jobId}:${now}`,
    createdAt: now,
    ok: Boolean(response.ok ?? nativeResponse?.ok),
    status: report.status ?? response.status ?? nativeResponse?.status ?? 'UNKNOWN',
    jobId,
    deliveryMode: plan.deliveryMode ?? response.delivery?.delivery ?? 'unknown',
    summary: firstLine(summary),
    isPreview: summary.includes('SAFE_CHANGE_PREVIEW') || Boolean(previewJsonPath || previewDiffPath),
    previewHash,
    requiredPreviewHash,
    previewJsonPath,
    previewDiffPath,
    chatTextPath: plan.chatTextPath ?? null,
    fullReportPath: plan.fullReportPath ?? null,
    artifactCount: artifacts.length,
    artifacts: artifacts
      .filter((artifact) => artifact && artifact.upload !== false)
      .map((artifact) => ({
        path: artifact.path,
        kind: artifact.kind ?? 'unknown',
        size: Number(artifact.size ?? 0),
        sha256: artifact.sha256 ?? null,
        upload: artifact.upload !== false
      }))
  };
}

export function mergeDeliveryQueue(existingQueue, item, maxItems = 20) {
  const queue = Array.isArray(existingQueue) ? existingQueue : [];
  const next = [item, ...queue.filter((entry) => entry?.jobId !== item.jobId)];
  return next.slice(0, maxItems);
}

export function formatDeliveryResponse(nativeResponse) {
  const item = buildDeliveryQueueItem(nativeResponse);
  return formatDeliveryQueueItem(item);
}

export function formatDeliveryQueue(queue) {
  if (!Array.isArray(queue) || queue.length === 0) {
    return 'Delivery queue is empty.';
  }

  return queue.map(formatDeliveryQueueItem).join('\n\n---\n\n');
}

export function formatDeliveryQueueItem(item) {
  const lines = [
    `status=${item.status}`,
    `ok=${item.ok}`,
    `jobId=${item.jobId}`,
    `deliveryMode=${item.deliveryMode}`,
    `summary=${item.summary || '(none)'}`
  ];

  if (item.isPreview) lines.push('preview=true');
  if (item.previewHash) lines.push(`previewHash=${item.previewHash}`);
  if (item.requiredPreviewHash) lines.push(`requiredPreviewHash=${item.requiredPreviewHash}`);
  if (item.previewJsonPath) lines.push(`previewJsonPath=${item.previewJsonPath}`);
  if (item.previewDiffPath) lines.push(`previewDiffPath=${item.previewDiffPath}`);
  if (item.chatTextPath) lines.push(`chatTextPath=${item.chatTextPath}`);
  if (item.fullReportPath) lines.push(`fullReportPath=${item.fullReportPath}`);

  if (item.artifacts?.length) {
    lines.push('artifacts=');
    for (const artifact of item.artifacts) {
      lines.push(`- ${artifact.kind} ${artifact.size} bytes ${artifact.path}`);
    }
  } else {
    lines.push('artifacts=(none)');
  }

  return lines.join('\n');
}

export function findLatestPreviewQueueItem(queue) {
  return Array.isArray(queue) ? queue.find((item) => item?.isPreview && item?.previewHash) ?? null : null;
}

export function buildPreviewApplyHint(item) {
  if (!item?.previewHash) {
    return 'No preview apply requirement is available. Run SAFE_CHANGE_PREVIEW first.';
  }

  return [
    'ULTIMATEBRIDGE PREVIEW APPLY REQUIREMENT',
    `jobId=${item.jobId}`,
    `requiredPreviewHash=${item.previewHash}`,
    `previewJsonPath=${item.previewJsonPath ?? '(none)'}`,
    `previewDiffPath=${item.previewDiffPath ?? '(none)'}`,
    '',
    'Use this field in the matching SAFE_CHANGE request:',
    `"requiredPreviewHash": "${item.previewHash}"`
  ].join('\n');
}

function firstLine(value) {
  return String(value).split(/\r?\n/)[0].slice(0, 500);
}

function extractSummaryValue(summary, key) {
  const match = String(summary).match(new RegExp(`^${key}=([^\\r\\n]+)`, 'm'));
  if (!match) return null;
  const value = match[1].trim();
  return value && value !== '(none)' ? value : null;
}

function findArtifactPath(artifacts, suffix) {
  const match = artifacts.find((artifact) => typeof artifact?.path === 'string' && artifact.path.endsWith(suffix));
  return match?.path ?? null;
}
