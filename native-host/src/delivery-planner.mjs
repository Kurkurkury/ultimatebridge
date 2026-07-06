import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_DIRECT_REPORT_LIMIT } from '../../common/constants.mjs';

export async function writeDeliveryArtifacts(job, report, manifest, options = {}) {
  const directLimit = options.directLimit ?? DEFAULT_DIRECT_REPORT_LIMIT;
  const reportText = JSON.stringify(report, null, 2);
  const artifactItems = manifest?.items ?? [];
  const deliveryMode = reportText.length <= directLimit ? 'direct' : 'staged_artifacts';

  const chatText = buildChatText(report, artifactItems, deliveryMode, directLimit);
  const plan = {
    protocol: 'ULTIMATEBRIDGE_DELIVERY_PLAN_V1',
    jobId: job.jobId,
    deliveryMode,
    directLimit,
    reportBytes: Buffer.byteLength(reportText, 'utf8'),
    chatTextPath: path.join(job.runFolder, 'chatgpt-response.txt'),
    fullReportPath: path.join(job.runFolder, 'ultimatebridge-runner-report.json'),
    artifactCount: artifactItems.length,
    artifacts: artifactItems.map((item) => ({
      path: item.path,
      kind: item.kind,
      size: item.size,
      sha256: item.sha256,
      upload: item.upload
    }))
  };

  await fs.writeFile(plan.chatTextPath, chatText, 'utf8');
  const planPath = path.join(job.runFolder, 'delivery-plan.json');
  await fs.writeFile(planPath, JSON.stringify(plan, null, 2), 'utf8');

  return { plan, planPath, chatText };
}

function buildChatText(report, artifactItems, deliveryMode, directLimit) {
  const lines = [
    'ULTIMATEBRIDGE DELIVERY',
    `status=${report.status}`,
    `jobId=${report.jobId}`,
    `deliveryMode=${deliveryMode}`,
    `summary=${firstLine(report.summary ?? '')}`
  ];

  if (deliveryMode === 'direct') {
    lines.push('', JSON.stringify(report, null, 2));
    return lines.join('\n');
  }

  lines.push('', `Full report exceeded direct limit (${directLimit} chars).`);
  lines.push('Use the staged artifacts below:');

  for (const item of artifactItems) {
    if (item.upload) {
      lines.push(`- ${item.kind} ${item.size} bytes ${item.path}`);
    }
  }

  return lines.join('\n');
}

function firstLine(value) {
  return String(value).split(/\r?\n/)[0].slice(0, 500);
}
