import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createJob } from '../native-host/src/job-spool.mjs';
import { buildReport } from '../native-host/src/report-router.mjs';
import { buildAttachmentManifest, writeAttachmentManifest } from '../native-host/src/attachment-router.mjs';
import { writeDeliveryArtifacts } from '../native-host/src/delivery-planner.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-delivery-smoke-'));
const request = {
  protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
  requestId: 'DELIVERY_SMOKE',
  mode: 'READ_ONLY',
  taskName: 'DeliverySmoke',
  body: 'delivery smoke'
};

const job = await createJob(request, { root });
const fullArtifact = path.join(job.runFolder, 'large-output.txt');
await fs.writeFile(fullArtifact, 'large-output\n' + 'x'.repeat(20000), 'utf8');

const report = buildReport({
  requestId: request.requestId,
  jobId: job.jobId,
  status: 'OK',
  exitCode: 0,
  timedOut: false,
  runFolder: job.runFolder,
  summary: 'large delivery smoke ' + 'y'.repeat(20000)
});

const reportPath = path.join(job.runFolder, 'ultimatebridge-runner-report.json');
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

let manifest = await buildAttachmentManifest(job.jobId, [reportPath, fullArtifact]);
const delivery = await writeDeliveryArtifacts(job, report, manifest, { directLimit: 500 });
manifest = await buildAttachmentManifest(job.jobId, [reportPath, fullArtifact, delivery.planPath, delivery.plan.chatTextPath]);
const manifestPath = await writeAttachmentManifest(job.runFolder, manifest);

const result = {
  root,
  job,
  manifestPath,
  deliveryPlan: delivery.plan,
  manifest
};

console.log(JSON.stringify(result, null, 2));

if (delivery.plan.deliveryMode !== 'staged_artifacts') {
  process.exitCode = 1;
}
