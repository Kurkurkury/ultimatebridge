import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMessage } from '../native-host/src/host.mjs';

test('host executes read-only health flow and emits report artifacts', async () => {
  const response = await handleMessage({
    body: `AUTO_BRIDGE_REQUEST_ID=AUTO
TARGET_HOST=${process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'SPEIDELBASE'}
& .\\runner\\powershell\\UB_BeginTask.ps1 HealthCheck`
  });

  assert.equal(response.ok, true);
  assert.equal(response.report.protocol, 'ULTIMATEBRIDGE_RUNNER_REPORT_V1');
  assert.equal(response.report.status, 'OK');
  assert.ok(response.job.runFolder);
  assert.ok(response.manifest.items.some((item) => item.path.endsWith('ultimatebridge-runner-report.json')));
});

test('host blocks non-read-only modes in MVP', async () => {
  const response = await handleMessage({
    body: {
      protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
      requestId: 'AUTO',
      mode: 'SAFE_CHANGE',
      body: 'write something'
    }
  });

  assert.equal(response.ok, false);
  assert.equal(response.report.status, 'BLOCKED');
});
