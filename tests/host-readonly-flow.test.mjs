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

test('host blocks PROJECT_CHANGE mode until implemented', async () => {
  const response = await handleMessage({
    body: {
      protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
      requestId: 'AUTO',
      mode: 'PROJECT_CHANGE',
      body: 'write something'
    }
  });

  assert.equal(response.ok, false);
  assert.equal(response.report.status, 'BLOCKED');
});

test('host blocks SAFE_CHANGE without approvedProjectRoot before job execution', async () => {
  const response = await handleMessage({
    body: {
      protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
      requestId: 'AUTO',
      mode: 'SAFE_CHANGE',
      changes: [{ op: 'writeTextFile', path: 'x.txt', content: 'x' }]
    }
  });

  assert.equal(response.ok, false);
  assert.equal(response.code, 'MISSING_APPROVED_PROJECT_ROOT');
});
