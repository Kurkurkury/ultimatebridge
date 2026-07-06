import { handleMessage } from '../native-host/src/host.mjs';
import { buildDeliveryQueueItem, mergeDeliveryQueue, formatDeliveryQueue } from '../extension/src/delivery-queue.js';

const targetHost = process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'SPEIDELBASE';
const response = await handleMessage({
  body: [
    'AUTO_BRIDGE_REQUEST_ID=AUTO',
    `TARGET_HOST=${targetHost}`,
    '& .\\runner\\powershell\\UB_BeginTask.ps1 HealthCheck'
  ].join('\n')
});

const item = buildDeliveryQueueItem(response);
const queue = mergeDeliveryQueue([], item);
const text = formatDeliveryQueue(queue);

console.log(JSON.stringify({ item, queue, text }, null, 2));

if (!response.ok || item.status !== 'OK' || !item.jobId || !text.includes('deliveryMode=')) {
  process.exitCode = 1;
}
