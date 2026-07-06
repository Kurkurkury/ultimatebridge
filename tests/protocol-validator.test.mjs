import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRequest } from '../native-host/src/protocol-validator.mjs';

test('normalizes legacy AUTO request', () => {
  const request = normalizeRequest(`
AUTO_BRIDGE_REQUEST_ID=AUTO
& .\\runner\\powershell\\UB_BeginTask.ps1 HealthCheck
`, { localHost: 'SPEIDELBASE', defaultTargetHost: 'SPEIDELBASE' });

  assert.equal(request.protocol, 'ULTIMATEBRIDGE_REQUEST_V1');
  assert.equal(request.requestId, 'AUTO');
  assert.equal(request.mode, 'READ_ONLY');
});

test('blocks missing begin task', () => {
  assert.throws(() => normalizeRequest('AUTO_BRIDGE_REQUEST_ID=AUTO'), /task gate/i);
});

test('blocks host mismatch', () => {
  assert.throws(() => normalizeRequest({
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'AUTO',
    mode: 'READ_ONLY',
    targetHost: 'OTHERHOST',
    body: 'test'
  }, { localHost: 'SPEIDELBASE' }), /does not match/i);
});
