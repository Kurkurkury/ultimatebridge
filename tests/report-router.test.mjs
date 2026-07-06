import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, routeReport } from '../native-host/src/report-router.mjs';

test('builds report protocol', () => {
  const report = buildReport({ jobId: 'JOB1', summary: 'ok' });
  assert.equal(report.protocol, 'ULTIMATEBRIDGE_RUNNER_REPORT_V1');
  assert.equal(report.status, 'OK');
});

test('routes small report directly', async () => {
  const route = await routeReport({ status: 'OK', summary: 'small' }, { directLimit: 1000 });
  assert.equal(route.delivery, 'direct');
});
