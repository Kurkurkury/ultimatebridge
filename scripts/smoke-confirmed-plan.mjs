import { handleMessage } from '../native-host/src/host.mjs';
import { buildDeliveryQueueItem } from '../extension/src/delivery-queue.js';
import { buildArtifactUploadPlan, formatArtifactUploadPlan } from '../extension/src/artifact-upload-plan.js';

const targetHost = process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'SPEIDELBASE';
const response = await handleMessage({
  body: [
    'AUTO_BRIDGE_REQUEST_ID=AUTO',
    `TARGET_HOST=${targetHost}`,
    '& .\\runner\\powershell\\UB_BeginTask.ps1 HealthCheck'
  ].join('\n')
});

const queueItem = buildDeliveryQueueItem(response);
const plan = buildArtifactUploadPlan(queueItem);
const text = formatArtifactUploadPlan(plan);

console.log(JSON.stringify({ queueItem, plan, text }, null, 2));

if (!response.ok || !plan.userConfirmed || plan.action !== 'manual_upload_required' || plan.artifactCount < 1) {
  process.exitCode = 1;
}
