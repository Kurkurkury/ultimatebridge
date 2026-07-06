import { handleMessage } from '../native-host/src/host.mjs';

const host = process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? '';
const body = [
  'AUTO_BRIDGE_REQUEST_ID=AUTO',
  host ? `TARGET_HOST=${host}` : '',
  '& .\\runner\\powershell\\UB_BeginTask.ps1 HealthCheck'
].filter(Boolean).join('\n');

const response = await handleMessage({ body });
console.log(JSON.stringify(response, null, 2));

if (!response.ok) {
  process.exitCode = 1;
}
