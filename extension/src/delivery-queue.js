export const DELIVERY_QUEUE_KEY = 'ultimatebridgeDeliveryQueue';
export const LAST_DELIVERY_KEY = 'ultimatebridgeLastDelivery';

export function buildDeliveryQueueItem(nativeResponse, now = new Date().toISOString()) {
  const response = nativeResponse?.response ?? nativeResponse ?? {};
  const report = response.report ?? {};
  const plan = response.deliveryPlan ?? {};
  const manifest = response.manifest ?? {};
  const artifacts = Array.isArray(plan.artifacts) ? plan.artifacts : Array.isArray(manifest.items) ? manifest.items : [];
  const jobId = plan.jobId ?? report.jobId ?? response.job?.jobId ?? 'UNKNOWN_JOB';

  return {
    id: `${jobId}:${now}`,
    createdAt: now,
    ok: Boolean(response.ok ?? nativeResponse?.ok),
    status: report.status ?? response.status ?? nativeResponse?.status ?? 'UNKNOWN',
    jobId,
    deliveryMode: plan.deliveryMode ?? response.delivery?.delivery ?? 'unknown',
    summary: firstLine(report.summary ?? response.message ?? ''),
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

function firstLine(value) {
  return String(value).split(/\r?\n/)[0].slice(0, 500);
}
